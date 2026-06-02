struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  maxTileRefs: u32,
  splatScale: f32,
  minRadiusPx: f32,
  sourceSplatCount: u32,
  maxTilesPerSplat: u32,
};

const DEBUG_MODE_FINAL_COLOR = 0.0;
const DEBUG_MODE_COVERAGE_WEIGHT = 1.0;
const DEBUG_MODE_ACCUMULATED_ALPHA = 2.0;
const DEBUG_MODE_TRANSMITTANCE = 3.0;
const DEBUG_MODE_TILE_REF_COUNT = 4.0;
const DEBUG_MODE_CONIC_SHAPE = 5.0;

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> colors: array<f32>;
@group(0) @binding(3) var<storage, read> scales: array<f32>;
@group(0) @binding(4) var<storage, read> rotations: array<f32>;
@group(0) @binding(5) var<storage, read_write> tileHeaders: array<vec4u>;
@group(0) @binding(6) var<storage, read_write> tileRefs: array<atomic<u32>>;
@group(0) @binding(7) var<storage, read_write> tileCoverageWeights: array<f32>;
@group(0) @binding(8) var<storage, read_write> alphaParams: array<vec4f>;
@group(0) @binding(9) var outputColor: texture_storage_2d<rgba16float, write>;
@group(0) @binding(11) var<storage, read_write> tileScatterCursors: array<atomic<u32>>;
@group(0) @binding(12) var<storage, read> opacities: array<f32>;

const TILE_REF_SENTINEL = 0xffffffffu;
const RETENTION_SCORE_LOCK_BIT = 0x80000000u;
const RETENTION_SCORE_VALUE_MASK = 0x7fffffffu;
const MIN_SPLAT_CLIP_W = 0.0001;
const MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION = 4.0;
const MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION = 0.015625;
const COMPACT_FOOTPRINT_SIGMA_RADIUS = 3.0;
const COMPACT_FOOTPRINT_EPSILON = 0.000000001;
const SOURCE_FRONTIER_COMPOSITOR_ORDER_BUCKET_COUNT = 16u;

struct SplatShape {
  axis0: vec3f,
  axis1: vec3f,
  axis2: vec3f,
};

struct GpuLiveConic {
  centerPx: vec2f,
  inverseConic: vec3f,
  majorRadiusPx: f32,
  minorRadiusPx: f32,
};

fn tile_count() -> u32 {
  return max(frame.tileGrid.x * frame.tileGrid.y, 1u);
}

fn tile_ref_capacity_per_tile() -> u32 {
  return max(frame.maxTileRefs / tile_count(), 1u);
}

fn tile_ref_word_index(refIndex: u32, component: u32) -> u32 {
  return refIndex * 4u + component;
}

fn load_tile_ref(refIndex: u32) -> vec4u {
  return vec4u(
    atomicLoad(&tileRefs[tile_ref_word_index(refIndex, 0u)]),
    atomicLoad(&tileRefs[tile_ref_word_index(refIndex, 1u)]),
    atomicLoad(&tileRefs[tile_ref_word_index(refIndex, 2u)]),
    atomicLoad(&tileRefs[tile_ref_word_index(refIndex, 3u)]),
  );
}

fn clear_tile_ref(refIndex: u32, tileId: u32) {
  atomicStore(&tileRefs[tile_ref_word_index(refIndex, 0u)], TILE_REF_SENTINEL);
  atomicStore(&tileRefs[tile_ref_word_index(refIndex, 1u)], 0u);
  atomicStore(&tileRefs[tile_ref_word_index(refIndex, 2u)], tileId);
  atomicStore(&tileRefs[tile_ref_word_index(refIndex, 3u)], refIndex);
}

fn projected_center_px(splatId: u32) -> vec2f {
  let positionBase = splatId * 3u;
  let center = vec3f(positions[positionBase], positions[positionBase + 1u], positions[positionBase + 2u]);
  let centerClip = frame.viewProj * vec4f(center, 1.0);
  let centerNdc = centerClip.xy / max(centerClip.w, 0.000001);
  return vec2f(
    (centerNdc.x * 0.5 + 0.5) * frame.viewport.x,
    (1.0 - (centerNdc.y * 0.5 + 0.5)) * frame.viewport.y,
  );
}

fn rotateAxis(rotation: vec4f, axis: vec3f) -> vec3f {
  let q = rotation / max(length(rotation), 0.000001);
  let u = vec3f(q.y, q.z, q.w);
  return axis + 2.0 * cross(u, cross(u, axis) + q.x * axis);
}

fn makeSplatShape(scaleLog: vec3f, rotation: vec4f) -> SplatShape {
  let scale = exp(scaleLog);
  return SplatShape(
    rotateAxis(rotation, vec3f(1.0, 0.0, 0.0)) * scale.x,
    rotateAxis(rotation, vec3f(0.0, 1.0, 0.0)) * scale.y,
    rotateAxis(rotation, vec3f(0.0, 0.0, 1.0)) * scale.z,
  );
}

fn viewProjectionLinearRow(row: u32) -> vec3f {
  return vec3f(frame.viewProj[0][row], frame.viewProj[1][row], frame.viewProj[2][row]);
}

fn projectAxisJacobian(axis: vec3f, centerClip: vec4f) -> vec2f {
  let viewProjRow0 = viewProjectionLinearRow(0u);
  let viewProjRow1 = viewProjectionLinearRow(1u);
  let viewProjRow3 = viewProjectionLinearRow(3u);
  let safeW = max(abs(centerClip.w), MIN_SPLAT_CLIP_W);
  let clipW2 = safeW * safeW;
  let viewJacobianX = (centerClip.w * viewProjRow0 - centerClip.x * viewProjRow3) / clipW2;
  let viewJacobianY = (centerClip.w * viewProjRow1 - centerClip.y * viewProjRow3) / clipW2;
  return vec2f(dot(viewJacobianX, axis), dot(viewJacobianY, axis));
}

fn boundedMinorRadiusPx(rawMajorRadiusPx: f32, rawMinorRadiusPx: f32, minRadiusPx: f32) -> f32 {
  if (rawMinorRadiusPx >= minRadiusPx) {
    return rawMinorRadiusPx;
  }
  if (rawMajorRadiusPx < minRadiusPx) {
    return minRadiusPx;
  }
  let inflatedMinor = max(
    rawMinorRadiusPx * MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION,
    minRadiusPx * MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION,
  );
  return min(minRadiusPx, inflatedMinor);
}

fn gpu_live_footprint_policy_scale(majorRadiusPx: f32, minorRadiusPx: f32) -> f32 {
  let areaCapPx = frame.viewport.x * frame.viewport.y * 0.01;
  let majorRadiusCapPx = max(min(frame.viewport.x, frame.viewport.y) * 0.65, frame.minRadiusPx);
  let footprintAreaPx = 3.14159265 * majorRadiusPx * minorRadiusPx;
  let areaScale = sqrt(areaCapPx / max(footprintAreaPx, areaCapPx));
  let majorScale = majorRadiusCapPx / max(majorRadiusPx, majorRadiusCapPx);
  return min(min(areaScale, majorScale), 1.0);
}

fn gpu_live_projected_conic(splatId: u32, centerClip: vec4f, centerPx: vec2f) -> GpuLiveConic {
  let vecBase = splatId * 3u;
  let quatBase = splatId * 4u;
  let shape = makeSplatShape(
    vec3f(scales[vecBase], scales[vecBase + 1u], scales[vecBase + 2u]),
    vec4f(rotations[quatBase], rotations[quatBase + 1u], rotations[quatBase + 2u], rotations[quatBase + 3u]),
  );
  let viewportScale = vec2f(frame.viewport.x, frame.viewport.y) * 0.5 * (frame.splatScale / 600.0);
  let axis0 = projectAxisJacobian(shape.axis0, centerClip) * viewportScale;
  let axis1 = projectAxisJacobian(shape.axis1, centerClip) * viewportScale;
  let axis2 = projectAxisJacobian(shape.axis2, centerClip) * viewportScale;
  let covXX = axis0.x * axis0.x + axis1.x * axis1.x + axis2.x * axis2.x;
  let covXY = axis0.x * axis0.y + axis1.x * axis1.y + axis2.x * axis2.y;
  let covYY = axis0.y * axis0.y + axis1.y * axis1.y + axis2.y * axis2.y;
  let trace = 0.5 * (covXX + covYY);
  let diff = 0.5 * (covXX - covYY);
  let root = sqrt(max(diff * diff + covXY * covXY, 0.0));
  let lambda0 = max(trace + root, 0.0);
  let lambda1 = max(trace - root, 0.0);
  var majorDir = vec2f(1.0, 0.0);
  if (abs(covXY) + abs(lambda0 - covXX) > 0.00000001) {
    majorDir = normalize(vec2f(covXY, lambda0 - covXX));
  } else if (covYY > covXX) {
    majorDir = vec2f(0.0, 1.0);
  }
  let minorDir = vec2f(-majorDir.y, majorDir.x);
  let rawMajorRadiusPx = sqrt(lambda0);
  let rawMinorRadiusPx = sqrt(lambda1);
  let minRadiusPx = max(frame.minRadiusPx, 0.0);
  let uncappedMajorRadiusPx = max(rawMajorRadiusPx, minRadiusPx);
  let uncappedMinorRadiusPx = boundedMinorRadiusPx(rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx);
  let footprintScale = gpu_live_footprint_policy_scale(uncappedMajorRadiusPx, uncappedMinorRadiusPx);
  let scaledMinorRadiusPx = max(uncappedMinorRadiusPx * footprintScale, minRadiusPx);
  let majorRadiusPx = max(uncappedMajorRadiusPx * footprintScale, scaledMinorRadiusPx);
  let minorRadiusPx = scaledMinorRadiusPx;
  let majorInvVar = 1.0 / max(majorRadiusPx * majorRadiusPx, 0.000001);
  let minorInvVar = 1.0 / max(minorRadiusPx * minorRadiusPx, 0.000001);
  let inverseXX = majorDir.x * majorDir.x * majorInvVar + minorDir.x * minorDir.x * minorInvVar;
  let inverseXY = majorDir.x * majorDir.y * majorInvVar + minorDir.x * minorDir.y * minorInvVar;
  let inverseYY = majorDir.y * majorDir.y * majorInvVar + minorDir.y * minorDir.y * minorInvVar;
  return GpuLiveConic(centerPx, vec3f(inverseXX, inverseXY, inverseYY), majorRadiusPx, minorRadiusPx);
}

fn gpu_live_compact_footprint_bounds(conic: GpuLiveConic, centerPx: vec2f, tileSizePx: u32) -> vec4u {
  let inverseConic = conic.inverseConic;
  let determinant = max(inverseConic.x * inverseConic.z - inverseConic.y * inverseConic.y, COMPACT_FOOTPRINT_EPSILON);
  let covarianceXx = max(inverseConic.z / determinant, 0.0);
  let covarianceYy = max(inverseConic.x / determinant, 0.0);
  let radius = vec2f(
    COMPACT_FOOTPRINT_SIGMA_RADIUS * sqrt(covarianceXx),
    COMPACT_FOOTPRINT_SIGMA_RADIUS * sqrt(covarianceYy),
  );
  let viewportMax = max(frame.viewport, vec2f(0.0, 0.0));
  let minCenterPx = clamp(centerPx - radius, vec2f(0.0, 0.0), viewportMax);
  let maxCenterPx = clamp(centerPx + radius, vec2f(0.0, 0.0), viewportMax);
  let maxTile = max(frame.tileGrid, vec2u(1u, 1u)) - vec2u(1u, 1u);
  let tileSize = max(f32(tileSizePx), 1.0);
  let minTileX = min(u32(floor(minCenterPx.x / tileSize)), maxTile.x);
  let minTileY = min(u32(floor(minCenterPx.y / tileSize)), maxTile.y);
  let maxTileX = min(u32(floor(max((maxCenterPx.x - COMPACT_FOOTPRINT_EPSILON) / tileSize, 0.0))), maxTile.x);
  let maxTileY = min(u32(floor(max((maxCenterPx.y - COMPACT_FOOTPRINT_EPSILON) / tileSize, 0.0))), maxTile.y);
  return vec4u(minTileX, minTileY, maxTileX, maxTileY);
}

fn gpu_live_tile_center_px(tileX: u32, tileY: u32, tileSizePx: u32) -> vec2f {
  let tileSize = f32(tileSizePx);
  return vec2f((f32(tileX) + 0.5) * tileSize, (f32(tileY) + 0.5) * tileSize);
}

fn gpu_live_tile_coverage_weight(conic: GpuLiveConic, tileCenterPx: vec2f) -> f32 {
  let delta = tileCenterPx - conic.centerPx;
  let tileMahalanobis2 = conic.inverseConic.x * delta.x * delta.x
    + 2.0 * conic.inverseConic.y * delta.x * delta.y
    + conic.inverseConic.z * delta.y * delta.y;
  return exp(-0.5 * tileMahalanobis2);
}

fn gpu_live_retention_election_score(
  tileCoverageWeight: f32,
  sourceOpacity: f32,
  sourceDepthNdc: f32,
  splatId: u32,
) -> u32 {
  let weightedCoverage = clamp(tileCoverageWeight * max(sourceOpacity, 0.000001), 0.0, 1.0);
  let coverageBucket = min(u32(weightedCoverage * 4095.0), 4095u);
  let frontness = clamp(1.0 - sourceDepthNdc, 0.0, 1.0);
  let depthBucket = min(u32(frontness * 2047.0), 2047u);
  let splatTie = 255u - min(splatId & 255u, 255u);
  return max((coverageBucket << 19u) | (depthBucket << 8u) | splatTie, 1u);
}

fn gpu_live_overflow_election_slot(tileId: u32, splatId: u32, tileCapacity: u32) -> u32 {
  let hashed = splatId * 747796405u + tileId * 2891336453u + 277803737u;
  return hashed % max(tileCapacity, 1u);
}

fn gpu_live_compositor_order_slot(sourceDepthNdc: f32, projectedSlot: u32, tileCapacity: u32) -> u32 {
  let safeCapacity = max(tileCapacity, 1u);
  let bucketCount = min(SOURCE_FRONTIER_COMPOSITOR_ORDER_BUCKET_COUNT, safeCapacity);
  let frontness = clamp(1.0 - sourceDepthNdc, 0.0, 1.0);
  let bucket = min(u32(frontness * f32(bucketCount - 1u)), bucketCount - 1u);
  let bucketStart = (bucket * safeCapacity) / bucketCount;
  let nextBucketStart = ((bucket + 1u) * safeCapacity) / bucketCount;
  let bucketWidth = max(nextBucketStart - bucketStart, 1u);
  return min(bucketStart + (projectedSlot % bucketWidth), safeCapacity - 1u);
}

fn source_frontier_compositor_ref_limit(headerRefCount: u32, gpuScatterCount: u32, tileCapacity: u32) -> u32 {
  if (headerRefCount > 0u) {
    return headerRefCount;
  }
  if (gpuScatterCount > 0u) {
    return tileCapacity;
  }
  return 0u;
}

fn gpu_live_retention_election_slot(
  projectedSlot: u32,
  compositorOrderSlot: u32,
  tileId: u32,
  splatId: u32,
  tileCapacity: u32,
) -> u32 {
  if (projectedSlot < tileCapacity) {
    return compositorOrderSlot;
  }
  return gpu_live_overflow_election_slot(tileId, splatId, tileCapacity);
}

fn gpu_live_try_commit_retained_ref(
  refIndex: u32,
  score: u32,
  splatId: u32,
  tileId: u32,
  tileCoverageWeight: f32,
  sourceOpacity: f32,
  centerPx: vec2f,
  inverseConic: vec3f,
) {
  let scoreIndex = tile_ref_word_index(refIndex, 1u);
  var previous = atomicLoad(&tileRefs[scoreIndex]);
  loop {
    let previousScore = previous & RETENTION_SCORE_VALUE_MASK;
    if (score <= previousScore) {
      break;
    }
    if ((previous & RETENTION_SCORE_LOCK_BIT) != 0u) {
      previous = atomicLoad(&tileRefs[scoreIndex]);
      continue;
    }
    let lockedScore = score | RETENTION_SCORE_LOCK_BIT;
    let exchange = atomicCompareExchangeWeak(&tileRefs[scoreIndex], previous, lockedScore);
    if (exchange.exchanged) {
      atomicStore(&tileRefs[tile_ref_word_index(refIndex, 0u)], splatId);
      atomicStore(&tileRefs[tile_ref_word_index(refIndex, 2u)], tileId);
      atomicStore(&tileRefs[tile_ref_word_index(refIndex, 3u)], refIndex);
      tileCoverageWeights[refIndex] = tileCoverageWeight;
      alphaParams[refIndex] = vec4f(sourceOpacity, centerPx.x, centerPx.y, f32(splatId));
      alphaParams[refIndex + frame.maxTileRefs] = vec4f(inverseConic, 0.0);
      atomicStore(&tileRefs[scoreIndex], score);
      break;
    }
    previous = exchange.old_value;
  }
}

fn conic_falloff_scale() -> f32 {
  return 2.0;
}

fn conic_pixel_weight(alphaParam: vec4f, conicParam: vec4f, pixelCenter: vec2f) -> f32 {
  let delta = pixelCenter - alphaParam.yz;
  let mahalanobis2 = conicParam.x * delta.x * delta.x
    + 2.0 * conicParam.y * delta.x * delta.y
    + conicParam.z * delta.y * delta.y;
  return exp(-conic_falloff_scale() * mahalanobis2);
}

fn inverse_conic_radii(conicParam: vec4f) -> vec2f {
  let xx = conicParam.x;
  let xy = conicParam.y;
  let yy = conicParam.z;
  let trace = xx + yy;
  let discriminant = sqrt(max((xx - yy) * (xx - yy) + 4.0 * xy * xy, 0.0));
  let lambdaSmall = max(0.5 * (trace - discriminant), 0.000001);
  let lambdaLarge = max(0.5 * (trace + discriminant), 0.000001);
  return vec2f(inverseSqrt(lambdaSmall), inverseSqrt(lambdaLarge));
}

fn diagnostic_log_heat(value: f32, scale: f32) -> f32 {
  let positive = max(value, 0.0);
  let positiveScale = max(scale, 1.0);
  return clamp(log(1.0 + positive * positiveScale) / log(1.0 + positiveScale), 0.0, 1.0);
}

fn diagnostic_contour(value: f32, frequency: f32) -> f32 {
  let phase = fract(max(value, 0.0) * max(frequency, 1.0));
  let centered = abs(phase - 0.5);
  return 1.0 - smoothstep(0.02, 0.12, centered);
}

fn tile_coord_stripe(pixelCenter: vec2f) -> f32 {
  let tileSize = max(frame.tileSizePx, 1.0);
  let local = fract(pixelCenter / tileSize);
  let edgeDistance = min(min(local.x, 1.0 - local.x), min(local.y, 1.0 - local.y));
  let edgeStripe = 1.0 - smoothstep(0.0, 0.08, edgeDistance);
  let localRamp = fract(local.x * 0.67 + local.y * 0.37);
  return max(edgeStripe, localRamp * 0.75);
}

fn debug_heatmap_color(
  debugMode: f32,
  coverageWeightSum: f32,
  accumulatedAlpha: f32,
  remainingTransmission: f32,
  tileRefCount: u32,
  maxMajorRadiusPx: f32,
  minMinorRadiusPx: f32,
  pixelCenter: vec2f,
) -> vec4f {
  if (debugMode == DEBUG_MODE_COVERAGE_WEIGHT) {
    let heat = diagnostic_log_heat(coverageWeightSum, 8.0);
    let contour = diagnostic_contour(coverageWeightSum, 7.0);
    return vec4f(heat, max(heat * 0.35, contour), 1.0 - heat * 0.85, 1.0);
  }
  if (debugMode == DEBUG_MODE_ACCUMULATED_ALPHA) {
    let heat = diagnostic_log_heat(accumulatedAlpha, 5.0);
    let contour = diagnostic_contour(accumulatedAlpha, 12.0);
    return vec4f(heat, heat * (0.45 + 0.55 * contour), max(0.12, 1.0 - heat), 1.0);
  }
  if (debugMode == DEBUG_MODE_TRANSMITTANCE) {
    let heat = clamp(remainingTransmission, 0.0, 1.0);
    let contour = diagnostic_contour(remainingTransmission, 12.0);
    return vec4f(heat, max(heat * 0.35, contour), 1.0 - heat, 1.0);
  }
  if (debugMode == DEBUG_MODE_TILE_REF_COUNT) {
    let heat = diagnostic_log_heat(f32(tileRefCount), 0.1);
    let stripe = tile_coord_stripe(pixelCenter);
    return vec4f(max(heat, stripe * 0.55), 1.0 - heat * 0.75, 0.12 + stripe * 0.5, 1.0);
  }
  if (debugMode == DEBUG_MODE_CONIC_SHAPE) {
    let major = clamp(maxMajorRadiusPx / 32.0, 0.0, 1.0);
    let minor = clamp(minMinorRadiusPx / 8.0, 0.0, 1.0);
    let anisotropy = clamp(maxMajorRadiusPx / max(minMinorRadiusPx, 0.000001) / 32.0, 0.0, 1.0);
    let support = diagnostic_log_heat(coverageWeightSum, 8.0);
    let contour = diagnostic_contour(coverageWeightSum, 10.0);
    return vec4f(max(major * support, contour * 0.35), minor * support, max(anisotropy, contour * 0.5), 1.0);
  }
  return vec4f(0.0, 0.0, 0.0, 1.0);
}

@compute @workgroup_size(64) fn clear_tiles(@builtin(global_invocation_id) globalId: vec3u) {
  let tileId = globalId.x;
  let tileCount = frame.tileGrid.x * frame.tileGrid.y;
  if (tileId >= tileCount) {
    return;
  }

  let tileCapacity = tile_ref_capacity_per_tile();
  atomicStore(&tileScatterCursors[tileId], 0u);
  tileHeaders[tileId] = vec4u(tileId * tileCapacity, 0u, 0u, 0u);
  for (var slot = 0u; slot < tileCapacity; slot = slot + 1u) {
    let refIndex = tileId * tileCapacity + slot;
    if (refIndex >= frame.maxTileRefs) {
      break;
    }
    clear_tile_ref(refIndex, tileId);
    tileCoverageWeights[refIndex] = 0.0;
    alphaParams[refIndex] = vec4f(0.0, 0.0, 0.0, 0.0);
    alphaParams[refIndex + frame.maxTileRefs] = vec4f(0.0, 0.0, 0.0, 0.0);
  }
}

@compute @workgroup_size(64) fn build_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let sourceOrdinal = globalId.x;
  if (sourceOrdinal >= frame.sourceSplatCount) {
    return;
  }
  var splatId = sourceOrdinal;
  if (frame.maxTilesPerSplat > 0u || frame.sourceSplatCount != frame.splatCount) {
    splatId = tileHeaders[tile_count() + sourceOrdinal].x;
  }
  if (splatId == 0xffffffffu || splatId >= frame.splatCount) {
    return;
  }

  let centerClip = frame.viewProj * vec4f(
    positions[splatId * 3u],
    positions[splatId * 3u + 1u],
    positions[splatId * 3u + 2u],
    1.0,
  );
  if (centerClip.w <= 0.0) {
    return;
  }
  let centerPx = projected_center_px(splatId);
  let conic = gpu_live_projected_conic(splatId, centerClip, centerPx);
  let tileSizePx = max(u32(frame.tileSizePx), 1u);
  let tileCapacity = tile_ref_capacity_per_tile();
  let tileBounds = gpu_live_compact_footprint_bounds(conic, centerPx, tileSizePx);
  var minTileX = tileBounds.x;
  var minTileY = tileBounds.y;
  var maxTileX = tileBounds.z;
  var maxTileY = tileBounds.w;
  if (frame.maxTilesPerSplat > 0u) {
    let radiusTiles = u32(max(floor((sqrt(f32(frame.maxTilesPerSplat)) - 1.0) / 2.0), 0.0));
    let footprintCapTileX = clamp(u32(centerPx.x) / tileSizePx, minTileX, maxTileX);
    let footprintCapTileY = clamp(u32(centerPx.y) / tileSizePx, minTileY, maxTileY);
    minTileX = max(minTileX, footprintCapTileX - min(footprintCapTileX, radiusTiles));
    minTileY = max(minTileY, footprintCapTileY - min(footprintCapTileY, radiusTiles));
    maxTileX = min(maxTileX, footprintCapTileX + radiusTiles);
    maxTileY = min(maxTileY, footprintCapTileY + radiusTiles);
  }
  let orderingKey = splatId;
  let sourceDepthNdc = centerClip.z / max(centerClip.w, 0.000001);
  for (var tileY = minTileY; tileY <= maxTileY; tileY = tileY + 1u) {
    for (var tileX = minTileX; tileX <= maxTileX; tileX = tileX + 1u) {
      let tileId = tileY * frame.tileGrid.x + tileX;
      if (tileId >= tile_count()) {
        continue;
      }
      let projectedSlot = atomicAdd(&tileScatterCursors[tileId], 1u);
      let compositorOrderSlot = gpu_live_compositor_order_slot(sourceDepthNdc, projectedSlot, tileCapacity);
      let slot = gpu_live_retention_election_slot(projectedSlot, compositorOrderSlot, tileId, splatId, tileCapacity);
      let refIndex = tileId * tileCapacity + slot;
      if (refIndex >= frame.maxTileRefs) {
        continue;
      }
      let tileCoverageWeight = gpu_live_tile_coverage_weight(
        conic,
        gpu_live_tile_center_px(tileX, tileY, tileSizePx)
      );
      let sourceOpacity = clamp(opacities[splatId], 0.0, 0.999);
      let retentionScore = gpu_live_retention_election_score(
        tileCoverageWeight,
        sourceOpacity,
        sourceDepthNdc,
        orderingKey
      );
      gpu_live_try_commit_retained_ref(
        refIndex,
        retentionScore,
        splatId,
        tileId,
        tileCoverageWeight,
        sourceOpacity,
        centerPx,
        conic.inverseConic
      );
    }
  }
}

@compute @workgroup_size(8, 8, 1) fn composite_tiles(@builtin(global_invocation_id) globalId: vec3u) {
  let outputSize = textureDimensions(outputColor);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) {
    return;
  }

  let tileSizePx = max(u32(frame.tileSizePx), 1u);
  let tileX = min(globalId.x / tileSizePx, frame.tileGrid.x - 1u);
  let tileY = min(globalId.y / tileSizePx, frame.tileGrid.y - 1u);
  let tileId = tileY * frame.tileGrid.x + tileX;
  let header = tileHeaders[tileId];
  let outputCoord = vec2i(globalId.xy);
  let pixelCenter = vec2f(f32(globalId.x) + 0.5, f32(globalId.y) + 0.5);
  let tileCapacity = tile_ref_capacity_per_tile();
  let gpuScatterCount = atomicLoad(&tileScatterCursors[tileId]);
  let liveRefCount = source_frontier_compositor_ref_limit(header.y, gpuScatterCount, tileCapacity);
  let flatRemainingRefs = frame.maxTileRefs - min(header.x, frame.maxTileRefs);
  let refLimit = min(liveRefCount, flatRemainingRefs);
  var composedColor = vec3f(0.02, 0.02, 0.04);
  var remainingTransmission = 1.0;
  var coverageWeightSum = 0.0;
  var maxMajorRadiusPx = 0.0;
  var minMinorRadiusPx = 1000000.0;
  for (var layer = 0u; layer < refLimit; layer = layer + 1u) {
    let refIndex = header.x + layer;
    if (refIndex >= frame.maxTileRefs) {
      break;
    }
    let tileRef = load_tile_ref(refIndex);
    if (tileRef.x >= frame.splatCount) {
      continue;
    }
    let alphaParamIndex = min(tileRef.w, frame.maxTileRefs - 1u);
    let alphaParam = alphaParams[alphaParamIndex];
    let conicParam = alphaParams[alphaParamIndex + frame.maxTileRefs];
    let tileCoverageWeight = max(tileCoverageWeights[refIndex], 0.0);
    if (tileCoverageWeight <= 0.0) {
      continue;
    }
    let pixelCoverageWeight = conic_pixel_weight(alphaParam, conicParam, pixelCenter);
    coverageWeightSum = coverageWeightSum + pixelCoverageWeight;
    let conicRadii = inverse_conic_radii(conicParam);
    maxMajorRadiusPx = max(maxMajorRadiusPx, conicRadii.x);
    minMinorRadiusPx = min(minMinorRadiusPx, conicRadii.y);
    let sourceOpacity = min(clamp(alphaParam.x, 0.0, 1.0), 0.999);
    let coverageAlpha = clamp(1.0 - pow(1.0 - sourceOpacity, pixelCoverageWeight), 0.0, 1.0);
    let colorBase = tileRef.x * 3u;
    let sourceColor = vec3f(colors[colorBase], colors[colorBase + 1u], colors[colorBase + 2u]);
    composedColor = sourceColor * coverageAlpha + composedColor * (1.0 - coverageAlpha);
    remainingTransmission = remainingTransmission * (1.0 - coverageAlpha);
  }
  let accumulatedAlpha = 1.0 - remainingTransmission;
  if (frame.debugMode == DEBUG_MODE_FINAL_COLOR) {
    textureStore(outputColor, outputCoord, vec4f(composedColor, accumulatedAlpha));
    return;
  }
  textureStore(
    outputColor,
    outputCoord,
    debug_heatmap_color(
      frame.debugMode,
      coverageWeightSum,
      accumulatedAlpha,
      remainingTransmission,
      refLimit,
      maxMajorRadiusPx,
      minMinorRadiusPx,
      pixelCenter
    )
  );
}
