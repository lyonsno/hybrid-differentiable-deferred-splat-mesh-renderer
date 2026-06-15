// Per-tile sort: load refs into shared memory, sort by depth, write back.
// Uses odd-even transposition sort — simple, parallel-friendly, and correct.
// O(n) parallel steps with 256 threads for up to 512 elements.

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

  let outCount = min(tileRefCount, SORT_CAP);

  // --- Load first batch (up to 512 elements, 2 per thread) ---
  for (var e = 0u; e < 2u; e++) {
    let si = lid * 2u + e;
    if (si < outCount) {
      let globalIdx = tileStart + si;
      sKeys[si] = unsortedRefs[globalIdx * REF_STRIDE + 1u]; // depth key
      sIdx[si] = globalIdx;
    } else {
      sKeys[si] = 0xFFFFFFFFu;
      sIdx[si] = 0xFFFFFFFFu;
    }
  }
  workgroupBarrier();

  // --- Odd-even transposition sort ---
  // 512 rounds of alternating odd/even compare-swap passes.
  // Each thread handles two adjacent pairs per round.
  // Guaranteed to sort N elements in N rounds.
  for (var round = 0u; round < SORT_CAP; round++) {
    let phase = round & 1u; // 0 = even pairs (0,1),(2,3),... ; 1 = odd pairs (1,2),(3,4),...

    // Each thread handles one pair
    let pairBase = lid * 2u + phase;
    let i = pairBase;
    let j = pairBase + 1u;

    if (j < SORT_CAP) {
      if (sKeys[i] > sKeys[j]) {
        let tk = sKeys[i]; sKeys[i] = sKeys[j]; sKeys[j] = tk;
        let ti = sIdx[i]; sIdx[i] = sIdx[j]; sIdx[j] = ti;
      }
    }
    workgroupBarrier();
  }

  // --- Stream remaining batches ---
  // For tiles with >512 refs, merge additional batches of 256.
  // After the initial sort, [0..511] is sorted ascending.
  // For each batch: load into back 256, then run 512 rounds of odd-even sort
  // to merge. Since front 256 is already sorted and back 256 is unsorted,
  // 256 rounds suffice (new elements bubble at most 256 positions).
  var batchStart = SORT_CAP;
  while (batchStart < tileRefCount) {
    // Replace back 256 with incoming batch
    if (lid < min(WG_SIZE, tileRefCount - batchStart)) {
      let globalIdx = tileStart + batchStart + lid;
      sKeys[WG_SIZE + lid] = unsortedRefs[globalIdx * REF_STRIDE + 1u];
      sIdx[WG_SIZE + lid] = globalIdx;
    } else {
      sKeys[WG_SIZE + lid] = 0xFFFFFFFFu;
      sIdx[WG_SIZE + lid] = 0xFFFFFFFFu;
    }
    workgroupBarrier();

    // 512 rounds to fully sort (overkill but correct)
    for (var round = 0u; round < SORT_CAP; round++) {
      let phase = round & 1u;
      let pairBase = lid * 2u + phase;
      let i = pairBase;
      let j = pairBase + 1u;

      if (j < SORT_CAP) {
        if (sKeys[i] > sKeys[j]) {
          let tk = sKeys[i]; sKeys[i] = sKeys[j]; sKeys[j] = tk;
          let ti = sIdx[i]; sIdx[i] = sIdx[j]; sIdx[j] = ti;
        }
      }
      workgroupBarrier();
    }

    batchStart += WG_SIZE;
  }

  // --- Write sorted refs to output ---
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

  // --- Passthrough copy for refs beyond sort cap ---
  // The sort only handles the nearest 512 refs. Any remaining refs are copied
  // unsorted so the compositor can still read them (it relies on transmittance
  // cutoff, not the cap, for early-out).
  if (tileRefCount > SORT_CAP) {
    var copyIdx = SORT_CAP + lid;
    while (copyIdx < tileRefCount) {
      let globalIdx = tileStart + copyIdx;
      let base = globalIdx * REF_STRIDE;
      for (var w = 0u; w < REF_STRIDE; w++) {
        sortedRefs[base + w] = unsortedRefs[base + w];
      }
      copyIdx += WG_SIZE;
    }
  }
}
