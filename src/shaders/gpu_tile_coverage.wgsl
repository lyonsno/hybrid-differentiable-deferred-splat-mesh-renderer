struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  maxTileRefs: u32,
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
@group(0) @binding(5) var<storage, read_write> tileHeaders: array<vec4u>;
@group(0) @binding(6) var<storage, read_write> tileRefs: array<vec4u>;
@group(0) @binding(7) var<storage, read_write> tileCoverageWeights: array<f32>;
@group(0) @binding(8) var<storage, read_write> alphaParams: array<vec4f>;
@group(0) @binding(9) var outputColor: texture_storage_2d<rgba16float, write>;
@group(0) @binding(10) var<storage, read_write> tileBuildCounts: array<atomic<u32>>;
@group(0) @binding(11) var<storage, read_write> tileScatterCursors: array<atomic<u32>>;

fn tile_count() -> u32 {
  return max(frame.tileGrid.x * frame.tileGrid.y, 1u);
}

fn tile_ref_capacity_per_tile() -> u32 {
  return max(frame.maxTileRefs / tile_count(), 1u);
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

fn conic_pixel_weight(alphaParam: vec4f, conicParam: vec4f, pixelCenter: vec2f) -> f32 {
  let delta = pixelCenter - alphaParam.yz;
  let mahalanobis2 = conicParam.x * delta.x * delta.x
    + 2.0 * conicParam.y * delta.x * delta.y
    + conicParam.z * delta.y * delta.y;
  return exp(-2.0 * mahalanobis2);
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
  atomicStore(&tileBuildCounts[tileId], 0u);
  atomicStore(&tileScatterCursors[tileId], 0u);
  tileHeaders[tileId] = vec4u(tileId * tileCapacity, 0u, 0u, 0u);
}

@compute @workgroup_size(64) fn build_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let splatId = globalId.x;
  if (splatId >= frame.splatCount) {
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
  let maxTile = max(frame.tileGrid, vec2u(1u)) - vec2u(1u, 1u);
  let centerPx = projected_center_px(splatId);
  let tileSizePx = max(u32(frame.tileSizePx), 1u);
  let tileX = min(u32(clamp(centerPx.x, 0.0, max(frame.viewport.x - 1.0, 0.0))) / tileSizePx, maxTile.x);
  let tileY = min(u32(clamp(centerPx.y, 0.0, max(frame.viewport.y - 1.0, 0.0))) / tileSizePx, maxTile.y);
  let firstTile = tileY * frame.tileGrid.x + tileX;
  if (firstTile >= tile_count()) {
    return;
  }
  let tileCapacity = tile_ref_capacity_per_tile();
  let projectedSlot = atomicAdd(&tileBuildCounts[firstTile], 1u);
  if (projectedSlot >= tileCapacity) {
    return;
  }
  let slot = atomicAdd(&tileScatterCursors[firstTile], 1u);
  if (slot >= tileCapacity) {
    return;
  }
  let refIndex = firstTile * tileCapacity + slot;
  if (refIndex >= frame.maxTileRefs) {
    return;
  }
  let orderingKey = splatId;
  tileRefs[refIndex] = vec4u(splatId, splatId, firstTile, refIndex);
  tileCoverageWeights[refIndex] = 1.0;
  let gpuPointSigma = 10.0;
  let inverseRadius2 = 1.0 / (gpuPointSigma * gpuPointSigma);
  alphaParams[refIndex] = vec4f(0.35, centerPx.x, centerPx.y, f32(orderingKey));
  alphaParams[refIndex + frame.maxTileRefs] = vec4f(inverseRadius2, 0.0, inverseRadius2, 0.0);
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
  let refLimit = min(max(header.y, gpuScatterCount), tileCapacity);
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
    let tileRef = tileRefs[refIndex];
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
