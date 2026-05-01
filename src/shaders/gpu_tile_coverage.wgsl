struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: u32,
  tileGrid: vec2u,
  splatCount: u32,
  maxTileRefs: u32,
};

const DEBUG_MODE_FINAL_COLOR = 0u;
const DEBUG_MODE_COVERAGE_WEIGHT = 1u;
const DEBUG_MODE_ACCUMULATED_ALPHA = 2u;
const DEBUG_MODE_TRANSMITTANCE = 3u;
const DEBUG_MODE_TILE_REF_COUNT = 4u;
const DEBUG_MODE_CONIC_SHAPE = 5u;

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> colors: array<f32>;
@group(0) @binding(4) var<storage, read_write> projectedBounds: array<vec4u>;
@group(0) @binding(5) var<storage, read_write> tileHeaders: array<vec4u>;
@group(0) @binding(6) var<storage, read_write> tileRefs: array<vec4u>;
@group(0) @binding(7) var<storage, read_write> tileCoverageWeights: array<f32>;
@group(0) @binding(8) var<storage, read> orderingKeys: array<u32>;
@group(0) @binding(9) var<storage, read> alphaParams: array<vec4f>;
@group(0) @binding(10) var outputColor: texture_storage_2d<rgba16float, write>;

fn conic_pixel_weight(alphaParam: vec4f, conicParam: vec4f, pixelCenter: vec2f) -> f32 {
  let delta = pixelCenter - alphaParam.yz;
  let mahalanobis2 = conicParam.x * delta.x * delta.x
    + 2.0 * conicParam.y * delta.x * delta.y
    + conicParam.z * delta.y * delta.y;
  return exp(-0.5 * mahalanobis2);
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

fn debug_heatmap_color(
  debugMode: u32,
  coverageWeightSum: f32,
  accumulatedAlpha: f32,
  remainingTransmission: f32,
  tileRefCount: u32,
  maxMajorRadiusPx: f32,
  minMinorRadiusPx: f32,
) -> vec4f {
  if (debugMode == DEBUG_MODE_COVERAGE_WEIGHT) {
    let heat = clamp(1.0 - exp(-coverageWeightSum), 0.0, 1.0);
    return vec4f(heat, heat * 0.55, 1.0 - heat, 1.0);
  }
  if (debugMode == DEBUG_MODE_ACCUMULATED_ALPHA) {
    let heat = clamp(accumulatedAlpha, 0.0, 1.0);
    return vec4f(heat, heat, heat, 1.0);
  }
  if (debugMode == DEBUG_MODE_TRANSMITTANCE) {
    let heat = clamp(remainingTransmission, 0.0, 1.0);
    return vec4f(heat, heat, 1.0 - heat, 1.0);
  }
  if (debugMode == DEBUG_MODE_TILE_REF_COUNT) {
    let heat = clamp(f32(tileRefCount) / 32.0, 0.0, 1.0);
    return vec4f(heat, 1.0 - heat, 0.15, 1.0);
  }
  if (debugMode == DEBUG_MODE_CONIC_SHAPE) {
    let major = clamp(maxMajorRadiusPx / 32.0, 0.0, 1.0);
    let minor = clamp(minMinorRadiusPx / 8.0, 0.0, 1.0);
    let anisotropy = clamp(maxMajorRadiusPx / max(minMinorRadiusPx, 0.000001) / 32.0, 0.0, 1.0);
    return vec4f(major, minor, anisotropy, 1.0);
  }
  return vec4f(0.0, 0.0, 0.0, 1.0);
}

@compute @workgroup_size(64) fn project_bounds(@builtin(global_invocation_id) globalId: vec3u) {
  let splatId = globalId.x;
  if (splatId >= frame.splatCount) {
    return;
  }

  let positionBase = splatId * 3u;
  let center = vec3f(positions[positionBase], positions[positionBase + 1u], positions[positionBase + 2u]);
  let centerClip = frame.viewProj * vec4f(center, 1.0);
  if (centerClip.w <= 0.0) {
    projectedBounds[splatId] = vec4u(1u, 1u, 0u, 0u);
    return;
  }

  let maxTile = max(frame.tileGrid, vec2u(1u)) - vec2u(1u, 1u);
  projectedBounds[splatId] = vec4u(0u, 0u, maxTile.x, maxTile.y);
}

@compute @workgroup_size(64) fn clear_tiles(@builtin(global_invocation_id) globalId: vec3u) {
  let tileId = globalId.x;
  let tileCount = frame.tileGrid.x * frame.tileGrid.y;
  if (tileId >= tileCount) {
    return;
  }

  tileHeaders[tileId] = vec4u(0u, 0u, 0u, 0u);
}

@compute @workgroup_size(64) fn build_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let splatId = globalId.x;
  if (splatId >= frame.splatCount || splatId >= frame.maxTileRefs) {
    return;
  }

  let bounds = projectedBounds[splatId];
  let firstTile = bounds.y * frame.tileGrid.x + bounds.x;
  let orderingKey = orderingKeys[splatId];
  let alphaParamIndex = min(splatId, frame.maxTileRefs - 1u);
  tileRefs[splatId] = vec4u(splatId, firstTile, orderingKey, alphaParamIndex);
  tileCoverageWeights[splatId] = 0.0;
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
  let refLimit = min(header.y, 32u);
  var composedColor = vec3f(0.02, 0.02, 0.04);
  var remainingTransmission = 1.0;
  var previousRank = 0xffffffffu;
  var coverageWeightSum = 0.0;
  var maxMajorRadiusPx = 0.0;
  var minMinorRadiusPx = 1000000.0;
  for (var layer = 0u; layer < refLimit; layer = layer + 1u) {
    var selectedRefIndex = 0xffffffffu;
    var selectedRank = 0xffffffffu;
    for (var candidate = 0u; candidate < refLimit; candidate = candidate + 1u) {
      let refIndex = header.x + candidate;
      if (refIndex >= frame.maxTileRefs) {
        break;
      }
      let tileRef = tileRefs[refIndex];
      if (tileRef.x >= frame.splatCount) {
        continue;
      }
      let rank = orderingKeys[tileRef.x];
      if ((previousRank == 0xffffffffu || rank > previousRank) && rank < selectedRank) {
        selectedRank = rank;
        selectedRefIndex = refIndex;
      }
    }
    if (selectedRefIndex == 0xffffffffu) {
      break;
    }
    previousRank = selectedRank;
    let tileRef = tileRefs[selectedRefIndex];
    let alphaParamIndex = min(tileRef.w, frame.maxTileRefs - 1u);
    let alphaParam = alphaParams[alphaParamIndex];
    let conicParam = alphaParams[alphaParamIndex + frame.maxTileRefs];
    let tileCoverageWeight = max(tileCoverageWeights[selectedRefIndex], 0.0);
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
      header.y,
      maxMajorRadiusPx,
      minMinorRadiusPx
    )
  );
}
