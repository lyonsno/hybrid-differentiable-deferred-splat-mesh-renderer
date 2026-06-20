// Per-tile bitonic depth sort for small tiles (≤4096 entries).
// Dispatched from smallTileList built by the classify pass.
// Adapted from PlayCanvas engine gsplat-local-bitonic.js (MIT license).
//
// Uses raw f32 depth bits (bitcast as u32) for full precision sorting —
// IEEE 754 positive floats are order-preserving when compared as u32.
//
// Dispatch: (smallTileCount, 1, 1). One workgroup per small tile.

const BITONIC_WG_SIZE = 256u;
const MAX_TILE_ENTRIES = 4096u;

@group(0) @binding(0) var<storage, read_write> tileEntries: array<u32>;
@group(0) @binding(1) var<storage, read> tileCounts: array<u32>;
@group(0) @binding(2) var<storage, read> depthBuffer: array<u32>;
@group(0) @binding(3) var<storage, read> smallTileList: array<u32>;
@group(0) @binding(4) var<storage, read> tileListCounts: array<u32>;
@group(0) @binding(5) var<storage, read> tileOffsets: array<u32>;

fn insertZeroBit(v: u32, bitPos: u32) -> u32 {
  let mask = (1u << bitPos) - 1u;
  return ((v >> bitPos) << (bitPos + 1u)) | (v & mask);
}

var<workgroup> sKeys: array<u32, 4096>;   // raw depth bits (f32 bitcast as u32)
var<workgroup> sVals: array<u32, 4096>;   // sortRank (tile entry value)

@compute @workgroup_size(256)
fn tile_depth_sort(
  @builtin(workgroup_id) groupId: vec3u,
  @builtin(local_invocation_index) localIdx: u32,
) {
  let workgroupIdx = groupId.x;
  if (workgroupIdx >= tileListCounts[0]) { return; }

  let mortonId = smallTileList[workgroupIdx];
  let tileStart = tileOffsets[mortonId];
  let count = min(tileCounts[mortonId], MAX_TILE_ENTRIES);
  if (count <= 1u) { return; }

  // Phase 1: Load raw depth keys and sortRank values
  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      let sortRank = tileEntries[tileStart + i];
      sKeys[i] = depthBuffer[sortRank];
      sVals[i] = sortRank;
    } else {
      sKeys[i] = 0xFFFFFFFFu;
      sVals[i] = 0xFFFFFFFFu;
    }
  }
  workgroupBarrier();

  // Phase 2: Bitonic sort on raw depth keys, swapping values in parallel
  for (var k: u32 = 2u; k <= MAX_TILE_ENTRIES; k = k << 1u) {
    for (var j: u32 = k >> 1u; j > 0u; j = j >> 1u) {
      let bitPos = countTrailingZeros(j);
      let halfN = MAX_TILE_ENTRIES >> 1u;
      for (var c = localIdx; c < halfN; c += BITONIC_WG_SIZE) {
        let l = insertZeroBit(c, bitPos);
        let r = l | j;
        let ascending = (l & k) == 0u;
        let shouldSwap = select(sKeys[l] < sKeys[r], sKeys[l] > sKeys[r], ascending);
        if (shouldSwap) {
          let tmpK = sKeys[l]; sKeys[l] = sKeys[r]; sKeys[r] = tmpK;
          let tmpV = sVals[l]; sVals[l] = sVals[r]; sVals[r] = tmpV;
        }
      }
      workgroupBarrier();
    }
  }

  // Phase 3: Write sorted sortRanks back to tileEntries
  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      tileEntries[tileStart + i] = sVals[i];
    }
  }
}
