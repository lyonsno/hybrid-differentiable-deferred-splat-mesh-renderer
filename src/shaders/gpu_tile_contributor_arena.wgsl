const HEADER_U32_STRIDE: u32 = 8u;
const HEADER_F32_STRIDE: u32 = 4u;
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

@group(0) @binding(0) var<storage, read_write> headerU32: array<u32>;
@group(0) @binding(1) var<storage, read_write> headerF32: array<f32>;
@group(0) @binding(2) var<storage, read_write> prefixCounts: array<u32>;
@group(0) @binding(3) var<storage, read_write> projectedCounts: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> scatterCursors: array<atomic<u32>>;
@group(0) @binding(5) var<storage, read> projectedContributors: array<ProjectedContributor>;
@group(0) @binding(6) var<storage, read_write> recordU32: array<u32>;
@group(0) @binding(7) var<storage, read_write> recordF32: array<f32>;

@compute @workgroup_size(64) fn clear_contributor_arena(@builtin(global_invocation_id) globalId: vec3u) {
  let tileIndex = globalId.x;
  if (tileIndex >= arrayLength(&prefixCounts)) {
    return;
  }

  prefixCounts[tileIndex] = 0u;
  atomicStore(&projectedCounts[tileIndex], 0u);
  atomicStore(&scatterCursors[tileIndex], 0u);

  let headerBaseU32 = tileIndex * HEADER_U32_STRIDE;
  headerU32[headerBaseU32] = 0u;
  headerU32[headerBaseU32 + 1u] = 0u;
  headerU32[headerBaseU32 + 2u] = 0u;
  headerU32[headerBaseU32 + 3u] = 0u;
  headerU32[headerBaseU32 + 4u] = 0u;
  headerU32[headerBaseU32 + 5u] = 0xffffffffu;
  headerU32[headerBaseU32 + 6u] = 0u;
  headerU32[headerBaseU32 + 7u] = 0u;

  let headerBaseF32 = tileIndex * HEADER_F32_STRIDE;
  headerF32[headerBaseF32] = 0.0;
  headerF32[headerBaseF32 + 1u] = 0.0;
  headerF32[headerBaseF32 + 2u] = 0.0;
  headerF32[headerBaseF32 + 3u] = 0.0;
}

@compute @workgroup_size(64) fn count_tile_contributors(@builtin(global_invocation_id) globalId: vec3u) {
  let contributorIndex = globalId.x;
  if (contributorIndex >= arrayLength(&projectedContributors)) {
    return;
  }
  let projected = projectedContributors[contributorIndex];
  let tileIndex = projected.tileIndex;
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
  for (var tileIndex = 0u; tileIndex < arrayLength(&prefixCounts); tileIndex = tileIndex + 1u) {
    let projectedCount = atomicLoad(&projectedCounts[tileIndex]);
    prefixCounts[tileIndex] = runningOffset;

    let headerBaseU32 = tileIndex * HEADER_U32_STRIDE;
    headerU32[headerBaseU32] = runningOffset;
    headerU32[headerBaseU32 + 1u] = projectedCount;
    headerU32[headerBaseU32 + 2u] = projectedCount;
    headerU32[headerBaseU32 + 3u] = 0u;
    headerU32[headerBaseU32 + 4u] = 0u;
    headerU32[headerBaseU32 + 5u] = select(0xffffffffu, 0u, projectedCount > 0u);

    runningOffset = runningOffset + projectedCount;
  }
}

@compute @workgroup_size(64) fn scatter_tile_contributors(@builtin(global_invocation_id) globalId: vec3u) {
  let contributorIndex = globalId.x;
  if (contributorIndex >= arrayLength(&projectedContributors)) {
    return;
  }
  let projected = projectedContributors[contributorIndex];
  let tileIndex = projected.tileIndex;
  if (tileIndex >= arrayLength(&prefixCounts)) {
    return;
  }

  let slotInTile = atomicAdd(&scatterCursors[tileIndex], 1u);
  let recordIndex = prefixCounts[tileIndex] + slotInTile;
  if (recordIndex >= arrayLength(&recordU32) / RECORD_U32_STRIDE) {
    let headerBaseU32 = tileIndex * HEADER_U32_STRIDE;
    headerU32[headerBaseU32 + 4u] = headerU32[headerBaseU32 + 4u] | 2u;
    return;
  }

  let recordBaseU32 = recordIndex * RECORD_U32_STRIDE;
  recordU32[recordBaseU32] = projected.splatIndex;
  recordU32[recordBaseU32 + 1u] = projected.originalId;
  recordU32[recordBaseU32 + 2u] = projected.tileIndex;
  recordU32[recordBaseU32 + 3u] = recordIndex;
  recordU32[recordBaseU32 + 4u] = projected.viewRank;
  recordU32[recordBaseU32 + 5u] = 0u;
  recordU32[recordBaseU32 + 6u] = 0u;
  recordU32[recordBaseU32 + 7u] = 0u;

  let recordBaseF32 = recordIndex * RECORD_F32_STRIDE;
  recordF32[recordBaseF32] = projected.viewDepth;
  recordF32[recordBaseF32 + 1u] = projected.depthBand;
  recordF32[recordBaseF32 + 2u] = projected.coverageWeight;
  recordF32[recordBaseF32 + 3u] = projected.centerPx.x;
  recordF32[recordBaseF32 + 4u] = projected.centerPx.y;
  recordF32[recordBaseF32 + 5u] = projected.inverseConic.x;
  recordF32[recordBaseF32 + 6u] = projected.inverseConic.y;
  recordF32[recordBaseF32 + 7u] = projected.inverseConic.z;
  recordF32[recordBaseF32 + 8u] = projected.opacity;
  recordF32[recordBaseF32 + 9u] = projected.coverageAlpha;
  recordF32[recordBaseF32 + 10u] = projected.transmittanceBefore;
  recordF32[recordBaseF32 + 11u] = projected.retentionWeight;
  recordF32[recordBaseF32 + 12u] = projected.occlusionWeight;
  recordF32[recordBaseF32 + 13u] = 0.0;
  recordF32[recordBaseF32 + 14u] = 0.0;
  recordF32[recordBaseF32 + 15u] = 0.0;

  let headerBaseU32 = tileIndex * HEADER_U32_STRIDE;
  headerU32[headerBaseU32 + 5u] = max(headerU32[headerBaseU32 + 5u], projected.viewRank);

  let headerBaseF32 = tileIndex * HEADER_F32_STRIDE;
  if (slotInTile == 0u) {
    headerF32[headerBaseF32] = projected.viewDepth;
    headerF32[headerBaseF32 + 1u] = projected.viewDepth;
  } else {
    headerF32[headerBaseF32] = min(headerF32[headerBaseF32], projected.viewDepth);
    headerF32[headerBaseF32 + 1u] = max(headerF32[headerBaseF32 + 1u], projected.viewDepth);
  }
}
