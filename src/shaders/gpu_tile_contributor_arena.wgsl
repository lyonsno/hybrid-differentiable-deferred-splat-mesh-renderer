const RECORD_U32_STRIDE: u32 = 8u;
const RECORD_F32_STRIDE: u32 = 16u;

struct ProjectedContributor {
  splatIndex: u32,
  originalId: u32,
  tileIndex: u32,
  viewRank: u32,
  viewDepth: f32,
  depthBand: f32,
  coverageWeight: f32,
  centerPx: vec2f,
  inverseConic: vec3f,
  opacity: f32,
  coverageAlpha: f32,
  transmittanceBefore: f32,
  retentionWeight: f32,
  occlusionWeight: f32,
};

@group(0) @binding(0) var<storage, read_write> projectedCounts: array<atomic<u32>>;
@group(0) @binding(1) var<storage, read_write> scatterCursors: array<atomic<u32>>;
@group(0) @binding(2) var<storage, read> projectedContributorU32: array<u32>;
@group(0) @binding(3) var<storage, read> projectedContributorF32: array<f32>;
@group(0) @binding(4) var<storage, read_write> legacyTileHeaders: array<vec4u>;
@group(0) @binding(5) var<storage, read_write> legacyTileRefs: array<vec4u>;
@group(0) @binding(6) var<storage, read_write> legacyTileCoverageWeights: array<f32>;
@group(0) @binding(7) var<storage, read_write> legacyAlphaParams: array<vec4f>;

fn projected_contributor_count() -> u32 {
  return arrayLength(&projectedContributorU32) / RECORD_U32_STRIDE;
}

fn projected_splat_index(index: u32) -> u32 {
  return projectedContributorU32[index * RECORD_U32_STRIDE];
}

fn projected_original_id(index: u32) -> u32 {
  return projectedContributorU32[index * RECORD_U32_STRIDE + 1u];
}

fn projected_tile_index(index: u32) -> u32 {
  return projectedContributorU32[index * RECORD_U32_STRIDE + 2u];
}

fn projected_view_rank(index: u32) -> u32 {
  return projectedContributorU32[index * RECORD_U32_STRIDE + 4u];
}

fn projected_f32(index: u32, field: u32) -> f32 {
  return projectedContributorF32[index * RECORD_F32_STRIDE + field];
}

@compute @workgroup_size(64) fn clear_contributor_arena(@builtin(global_invocation_id) globalId: vec3u) {
  let tileIndex = globalId.x;
  if (tileIndex >= arrayLength(&legacyTileHeaders)) {
    return;
  }

  atomicStore(&projectedCounts[tileIndex], 0u);
  atomicStore(&scatterCursors[tileIndex], 0u);
  legacyTileHeaders[tileIndex] = vec4u(0u, 0u, 0u, 0u);
}

@compute @workgroup_size(64) fn count_tile_contributors(@builtin(global_invocation_id) globalId: vec3u) {
  let contributorIndex = globalId.x;
  if (contributorIndex >= projected_contributor_count()) {
    return;
  }
  let tileIndex = projected_tile_index(contributorIndex);
  if (tileIndex >= arrayLength(&projectedCounts)) {
    return;
  }
  atomicAdd(&projectedCounts[tileIndex], 1u);
}

@compute @workgroup_size(64) fn prefix_tile_contributor_counts(@builtin(global_invocation_id) globalId: vec3u) {
  if (globalId.x != 0u) {
    return;
  }

  var runningOffset = 0u;
  for (var tileIndex = 0u; tileIndex < arrayLength(&legacyTileHeaders); tileIndex = tileIndex + 1u) {
    let projectedCount = atomicLoad(&projectedCounts[tileIndex]);
    legacyTileHeaders[tileIndex] = vec4u(runningOffset, projectedCount, projectedCount, 0u);

    runningOffset = runningOffset + projectedCount;
  }
}

@compute @workgroup_size(64) fn scatter_tile_contributors(@builtin(global_invocation_id) globalId: vec3u) {
  let contributorIndex = globalId.x;
  if (contributorIndex >= projected_contributor_count()) {
    return;
  }
  let tileIndex = projected_tile_index(contributorIndex);
  if (tileIndex >= arrayLength(&legacyTileHeaders)) {
    return;
  }

  let slotInTile = atomicAdd(&scatterCursors[tileIndex], 1u);
  let tileHeader = legacyTileHeaders[tileIndex];
  let recordIndex = tileHeader.x + slotInTile;
  if (recordIndex >= arrayLength(&legacyTileRefs)) {
    legacyTileHeaders[tileIndex] = vec4u(tileHeader.x, tileHeader.y, tileHeader.z, tileHeader.w | 2u);
    return;
  }

  let splatIndex = projected_splat_index(contributorIndex);
  let originalId = projected_original_id(contributorIndex);
  let viewRank = projected_view_rank(contributorIndex);

  let coverageWeight = projected_f32(contributorIndex, 2u);
  let centerPx = vec2f(projected_f32(contributorIndex, 3u), projected_f32(contributorIndex, 4u));
  let inverseConic = vec3f(
    projected_f32(contributorIndex, 5u),
    projected_f32(contributorIndex, 6u),
    projected_f32(contributorIndex, 7u),
  );
  let opacity = projected_f32(contributorIndex, 8u);

  legacyTileRefs[recordIndex] = vec4u(splatIndex, originalId, tileIndex, recordIndex);
  legacyTileCoverageWeights[recordIndex] = coverageWeight;
  let maxLegacyRefs = arrayLength(&legacyTileRefs);
  legacyAlphaParams[recordIndex] = vec4f(opacity, centerPx.x, centerPx.y, f32(viewRank));
  legacyAlphaParams[recordIndex + maxLegacyRefs] = vec4f(inverseConic.x, inverseConic.y, inverseConic.z, 0.0);
}
