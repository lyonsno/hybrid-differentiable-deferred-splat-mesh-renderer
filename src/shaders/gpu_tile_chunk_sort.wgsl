// Chunk sort: bitonic sort for chunks produced by bucket pre-sort.
// Adapted from PlayCanvas engine gsplat-local-chunk-sort.js (MIT license).
//
// Each workgroup reads (start, count) from chunkRanges and sorts entries
// in tileEntries by depth using raw f32 depth bits for full precision.
//
// Dispatch: (maxChunks, 1, 1). Workgroups beyond totalChunks[0] early-out.

const BITONIC_WG_SIZE = 256u;
const MAX_TILE_ENTRIES = 4096u;

struct ChunkSortParams {
  maxChunks: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<uniform> params: ChunkSortParams;
@group(0) @binding(1) var<storage, read_write> tileEntries: array<u32>;
@group(0) @binding(2) var<storage, read> depthBuffer: array<u32>;
@group(0) @binding(3) var<storage, read> chunkRanges: array<u32>;
@group(0) @binding(4) var<storage, read> totalChunks: array<u32>;

// write_chunk_indirect bindings (separate bind group layout)
@group(1) @binding(0) var<storage, read_write> indirectDispatchArgs: array<u32>;

fn insertZeroBit(v: u32, bitPos: u32) -> u32 {
  let mask = (1u << bitPos) - 1u;
  return ((v >> bitPos) << (bitPos + 1u)) | (v & mask);
}

var<workgroup> sKeys: array<u32, 4096>;   // raw depth bits
var<workgroup> sVals: array<u32, 4096>;   // sortRank values

@compute @workgroup_size(256)
fn chunk_sort(
  @builtin(workgroup_id) groupId: vec3u,
  @builtin(local_invocation_index) localIdx: u32,
) {
  let chunkIdx = groupId.x;
  if (chunkIdx >= min(totalChunks[0], params.maxChunks)) { return; }

  let tStart = chunkRanges[chunkIdx * 2u];
  let count = min(chunkRanges[chunkIdx * 2u + 1u], MAX_TILE_ENTRIES);
  if (count <= 1u) { return; }

  // Phase 1: Load raw depth keys and sortRank values
  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      let sortRank = tileEntries[tStart + i];
      sKeys[i] = depthBuffer[sortRank];
      sVals[i] = sortRank;
    } else {
      sKeys[i] = 0xFFFFFFFFu;
      sVals[i] = 0xFFFFFFFFu;
    }
  }
  workgroupBarrier();

  // Phase 2: Bitonic sort on raw depth keys
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

  // Phase 3: Write sorted sortRanks back
  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      tileEntries[tStart + i] = sVals[i];
    }
  }
}

// Single-thread copy pass: write totalChunks into indirect dispatch args.
// Chunk sort args live at offset 6 (indices [6..8]) in the shared indirect buffer.
// Dispatch: (1, 1, 1). Runs between bucket sort and chunk sort.
@compute @workgroup_size(1)
fn write_chunk_indirect() {
  let numChunks = min(totalChunks[0], params.maxChunks);
  indirectDispatchArgs[6] = numChunks;
  indirectDispatchArgs[7] = 1u;
  indirectDispatchArgs[8] = 1u;
}
