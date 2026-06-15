// Chunk sort: bitonic sort for chunks produced by bucket pre-sort.
// Adapted from PlayCanvas engine gsplat-local-chunk-sort.js (MIT license).
//
// Each workgroup reads (start, count) from chunkRanges and sorts entries
// in tileEntries by depth using the same bitonic sort as small tiles.
//
// Dispatch: (maxChunks, 1, 1). Workgroups beyond totalChunks[0] early-out.

const BITONIC_WG_SIZE = 256u;
const MAX_TILE_ENTRIES = 4096u;
const INDEX_BITS = 12u;
const INDEX_MASK = 0xFFFu;
const DEPTH_LEVELS: f32 = 1048575.0;

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

var<workgroup> sData: array<u32, 4096>;
var<workgroup> sDepthMin: atomic<u32>;
var<workgroup> sDepthMax: atomic<u32>;

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

  // Phase 1: Load depths
  if (localIdx == 0u) {
    atomicStore(&sDepthMin, 0xFFFFFFFFu);
    atomicStore(&sDepthMax, 0u);
  }

  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      sData[i] = depthBuffer[tileEntries[tStart + i]];
    } else {
      sData[i] = 0xFFFFFFFFu;
    }
  }
  workgroupBarrier();

  // Phase 2: Min/max reduction
  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (sData[i] != 0xFFFFFFFFu) {
      atomicMin(&sDepthMin, sData[i]);
      atomicMax(&sDepthMax, sData[i]);
    }
  }
  workgroupBarrier();

  let depthMin = bitcast<f32>(atomicLoad(&sDepthMin));
  let depthMax = bitcast<f32>(atomicLoad(&sDepthMax));
  let logMin = log(max(depthMin, 1e-6));
  let logRange = log(max(depthMax, 1e-6)) - logMin;
  let invLogRange = select(DEPTH_LEVELS / logRange, 0.0, logRange < 1e-10);

  // Phase 3: Pack (depth20 << 12 | localIndex12)
  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      let depth = bitcast<f32>(sData[i]);
      let logDepth = log(max(depth, 1e-6));
      let depth20 = min(u32((logDepth - logMin) * invLogRange + 0.5), u32(DEPTH_LEVELS));
      sData[i] = (depth20 << INDEX_BITS) | i;
    } else {
      sData[i] = 0xFFFFFFFFu;
    }
  }
  workgroupBarrier();

  // Phase 4: Bitonic sort — constant 12 stages
  for (var k: u32 = 2u; k <= MAX_TILE_ENTRIES; k = k << 1u) {
    for (var j: u32 = k >> 1u; j > 0u; j = j >> 1u) {
      let bitPos = countTrailingZeros(j);
      let halfN = MAX_TILE_ENTRIES >> 1u;
      for (var c = localIdx; c < halfN; c += BITONIC_WG_SIZE) {
        let l = insertZeroBit(c, bitPos);
        let r = l | j;
        let ascending = (l & k) == 0u;
        let shouldSwap = select(sData[l] < sData[r], sData[l] > sData[r], ascending);
        if (shouldSwap) {
          let tmp = sData[l]; sData[l] = sData[r]; sData[r] = tmp;
        }
      }
      workgroupBarrier();
    }
  }

  // Phase 5: Gather sorted entries and write back
  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      let localIndex = sData[i] & INDEX_MASK;
      sData[i] = tileEntries[tStart + localIndex];
    }
  }
  workgroupBarrier();

  for (var i = localIdx; i < MAX_TILE_ENTRIES; i += BITONIC_WG_SIZE) {
    if (i < count) {
      tileEntries[tStart + i] = sData[i];
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
