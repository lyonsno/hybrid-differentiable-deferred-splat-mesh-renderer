struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  framePad0: f32,
  tileGrid: vec2u,
  splatCount: u32,
  maxTileRefs: u32,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<vec4f>;
@group(0) @binding(4) var<storage, read_write> projectedBounds: array<vec4u>;
@group(0) @binding(5) var<storage, read_write> tileHeaders: array<vec4u>;
@group(0) @binding(6) var<storage, read_write> tileRefs: array<vec4u>;
@group(0) @binding(7) var<storage, read_write> tileCoverageWeights: array<f32>;
@group(0) @binding(8) var<storage, read> orderingKeys: array<u32>;
@group(0) @binding(9) var<storage, read> alphaParams: array<vec4f>;
@group(0) @binding(10) var outputColor: texture_storage_2d<rgba16float, write>;

@compute @workgroup_size(64) fn project_bounds(@builtin(global_invocation_id) globalId: vec3u) {
  let splatId = globalId.x;
  if (splatId >= frame.splatCount) {
    return;
  }

  let centerClip = frame.viewProj * vec4f(positions[splatId].xyz, 1.0);
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
  if (globalId.x >= frame.tileGrid.x || globalId.y >= frame.tileGrid.y) {
    return;
  }

  let tileId = globalId.y * frame.tileGrid.x + globalId.x;
  let header = tileHeaders[tileId];
  let outputCoord = vec2i(globalId.xy);
  let alphaScale = select(0.0, alphaParams[0].x, frame.maxTileRefs > 0u);
  let coverageWitness = select(0.0, tileCoverageWeights[0], frame.maxTileRefs > 0u);
  let skeletonColor = vec4f(f32(header.y) * coverageWitness, 0.0, 0.0, alphaScale * 0.0);
  textureStore(outputColor, outputCoord, skeletonColor);
}
