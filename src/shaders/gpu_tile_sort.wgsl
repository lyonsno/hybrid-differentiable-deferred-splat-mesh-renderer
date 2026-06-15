// Per-tile bitonic sort with streaming merge.
//
// Each workgroup sorts one tile's refs by depth (nearest first).
// 1. Load first 512 (depth, refIndex) pairs into shared memory
// 2. Bitonic sort all 512
// 3. For remaining refs in batches of 256:
//    - Replace back 256 entries with incoming batch
//    - Re-sort all 512 (front 256 guaranteed to be best 256 overall)
// 4. Write sorted front refs to output

const WG_SIZE = 256u;
const SORT_CAP = 512u;
const REF_STRIDE = 8u;

struct TileSortParams {
  tileCount: u32,
  totalRefs: u32,
  refStride: u32,
  _pad: u32,
};

@group(0) @binding(0) var<uniform> params: TileSortParams;
@group(0) @binding(1) var<storage, read> tileOffsets: array<u32>;
@group(0) @binding(2) var<storage, read> tileCounts: array<u32>;
@group(0) @binding(3) var<storage, read> unsortedRefs: array<u32>;
@group(0) @binding(4) var<storage, read_write> sortedRefs: array<u32>;

var<workgroup> sKeys: array<u32, 512>;
var<workgroup> sIdx: array<u32, 512>;

@compute @workgroup_size(256)
fn tile_sort(
  @builtin(workgroup_id) groupId: vec3u,
  @builtin(local_invocation_id) localId: vec3u,
) {
  let tileId = groupId.x;
  if (tileId >= params.tileCount) { return; }

  let lid = localId.x;
  let tileStart = tileOffsets[tileId];
  let tileRefCount = tileCounts[tileId];
  if (tileRefCount == 0u) { return; }

  // --- Load first batch (up to 512 elements, 2 per thread) ---
  for (var e = 0u; e < 2u; e++) {
    let si = lid * 2u + e;
    if (si < tileRefCount && si < SORT_CAP) {
      let globalIdx = tileStart + si;
      sKeys[si] = unsortedRefs[globalIdx * REF_STRIDE + 1u];
      sIdx[si] = globalIdx;
    } else {
      sKeys[si] = 0xFFFFFFFFu;
      sIdx[si] = 0xFFFFFFFFu;
    }
  }
  workgroupBarrier();

  // --- Bitonic sort 512 elements (9 stages) ---
  for (var stage = 0u; stage < 9u; stage++) {
    let blockSize = 1u << (stage + 1u);
    for (var sub = stage + 1u; sub > 0u; sub--) {
      let stride = 1u << (sub - 1u);
      workgroupBarrier();
      for (var e = 0u; e < 2u; e++) {
        let i = lid * 2u + e;
        let j = i ^ stride;
        if (j > i && j < SORT_CAP) {
          let asc = ((i & blockSize) == 0u);
          let swap = select(sKeys[i] < sKeys[j], sKeys[i] > sKeys[j], asc);
          if (swap) {
            let tk = sKeys[i]; sKeys[i] = sKeys[j]; sKeys[j] = tk;
            let ti = sIdx[i]; sIdx[i] = sIdx[j]; sIdx[j] = ti;
          }
        }
      }
    }
  }
  workgroupBarrier();

  // --- Stream remaining batches of 256 ---
  // After sort, positions 0..255 = best (nearest), 256..511 = worst.
  // Replace 256..511 with incoming batch, re-sort to push best to front.
  var batchStart = SORT_CAP;
  while (batchStart < tileRefCount) {
    // Load incoming batch into back half (positions 256..511)
    let inIdx = batchStart + lid;
    if (inIdx < tileRefCount) {
      let globalIdx = tileStart + inIdx;
      sKeys[WG_SIZE + lid] = unsortedRefs[globalIdx * REF_STRIDE + 1u];
      sIdx[WG_SIZE + lid] = globalIdx;
    } else {
      sKeys[WG_SIZE + lid] = 0xFFFFFFFFu;
      sIdx[WG_SIZE + lid] = 0xFFFFFFFFu;
    }
    workgroupBarrier();

    // Re-sort all 512
    for (var stage = 0u; stage < 9u; stage++) {
      let blockSize = 1u << (stage + 1u);
      for (var sub = stage + 1u; sub > 0u; sub--) {
        let stride = 1u << (sub - 1u);
        workgroupBarrier();
        for (var e = 0u; e < 2u; e++) {
          let i = lid * 2u + e;
          let j = i ^ stride;
          if (j > i && j < SORT_CAP) {
            let asc = ((i & blockSize) == 0u);
            let swap = select(sKeys[i] < sKeys[j], sKeys[i] > sKeys[j], asc);
            if (swap) {
              let tk = sKeys[i]; sKeys[i] = sKeys[j]; sKeys[j] = tk;
              let ti = sIdx[i]; sIdx[i] = sIdx[j]; sIdx[j] = ti;
            }
          }
        }
      }
    }
    workgroupBarrier();

    batchStart += WG_SIZE;
  }

  // --- Write sorted refs to output ---
  let outCount = min(tileRefCount, SORT_CAP);
  for (var e = 0u; e < 2u; e++) {
    let si = lid * 2u + e;
    if (si >= outCount) { continue; }
    let srcGlobalIdx = sIdx[si];
    if (srcGlobalIdx == 0xFFFFFFFFu) { continue; }

    let srcBase = srcGlobalIdx * REF_STRIDE;
    let dstBase = (tileStart + si) * REF_STRIDE;
    for (var w = 0u; w < REF_STRIDE; w++) {
      sortedRefs[dstBase + w] = unsortedRefs[srcBase + w];
    }
  }
}
