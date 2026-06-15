// Bucket pre-sort for large tiles (>4096 entries).
// Adapted from PlayCanvas engine gsplat-local-bucket-sort.js (MIT license).
//
// One workgroup per large tile. Distributes entries into 128 logarithmic depth
// buckets, then packs whole buckets into ≤4096 chunks. The chunk ranges are
// written to chunkRanges for the subsequent chunk sort dispatch.
//
// Uses overflow scratch in tileEntries (past maxTotalEntries) to avoid
// read/write aliasing during the scatter phase.
//
// Dispatch: (largeTileCount, 1, 1). One workgroup per large tile.

const NUM_BUCKETS = 128u;
const MAX_CHUNK_SIZE = 4096u;
const WG_SIZE = 256u;

struct BucketSortParams {
  bufferCapacity: u32,
  maxChunks: u32,
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> params: BucketSortParams;
@group(0) @binding(1) var<storage, read_write> tileEntries: array<u32>;
@group(0) @binding(2) var<storage, read> largeTileOverflowBases: array<u32>;
@group(0) @binding(3) var<storage, read> tileCounts: array<u32>;
@group(0) @binding(4) var<storage, read> depthBuffer: array<u32>;
@group(0) @binding(5) var<storage, read> largeTileList: array<u32>;
@group(0) @binding(6) var<storage, read_write> chunkRanges: array<u32>;
@group(0) @binding(7) var<storage, read_write> totalChunks: array<atomic<u32>>;
@group(0) @binding(8) var<storage, read> tileListCounts: array<u32>;
@group(0) @binding(9) var<storage, read> tileOffsets: array<u32>;

var<workgroup> sDepthMin: atomic<u32>;
var<workgroup> sDepthMax: atomic<u32>;
var<workgroup> sBucketCounts: array<atomic<u32>, 128>;
var<workgroup> sBucketOffsets: array<u32, 129>; // NUM_BUCKETS + 1
var<workgroup> sBucketCursors: array<atomic<u32>, 128>;

@compute @workgroup_size(256)
fn bucket_sort(
  @builtin(local_invocation_index) localIdx: u32,
  @builtin(workgroup_id) wid: vec3u,
) {
  let largeTileIdx = wid.x;
  if (largeTileIdx >= tileListCounts[1]) { return; }

  let mortonId = largeTileList[largeTileIdx];
  let tileStart = tileOffsets[mortonId];
  let count = tileCounts[mortonId];

  let overflowBase = largeTileOverflowBases[largeTileIdx];
  if (overflowBase + count > params.bufferCapacity) { return; }

  // --- Phase 1: Find depth min/max ---
  if (localIdx == 0u) {
    atomicStore(&sDepthMin, 0xFFFFFFFFu);
    atomicStore(&sDepthMax, 0u);
  }
  if (localIdx < NUM_BUCKETS) {
    atomicStore(&sBucketCounts[localIdx], 0u);
    atomicStore(&sBucketCursors[localIdx], 0u);
  }
  workgroupBarrier();

  for (var i = localIdx; i < count; i += WG_SIZE) {
    let entryIdx = tileEntries[tileStart + i];
    let depthU = depthBuffer[entryIdx];
    atomicMin(&sDepthMin, depthU);
    atomicMax(&sDepthMax, depthU);
  }
  workgroupBarrier();

  let depthMin = bitcast<f32>(atomicLoad(&sDepthMin));
  let depthMax = bitcast<f32>(atomicLoad(&sDepthMax));
  let logMin = log(max(depthMin, 1e-6));
  let logRange = log(max(depthMax, 1e-6)) - logMin;
  let bucketScale = select(f32(NUM_BUCKETS) / logRange, 0.0, logRange < 1e-10);

  // --- Phase 2: Histogram + copy to overflow scratch ---
  for (var i = localIdx; i < count; i += WG_SIZE) {
    let entryIdx = tileEntries[tileStart + i];
    let depth = bitcast<f32>(depthBuffer[entryIdx]);
    let bucket = min(u32((log(max(depth, 1e-6)) - logMin) * bucketScale), NUM_BUCKETS - 1u);
    atomicAdd(&sBucketCounts[bucket], 1u);
    tileEntries[overflowBase + i] = entryIdx;
  }
  workgroupBarrier();

  // --- Phase 3: Prefix sum on bucket counts (thread 0) ---
  if (localIdx == 0u) {
    sBucketOffsets[0] = 0u;
    for (var b: u32 = 0u; b < NUM_BUCKETS; b++) {
      sBucketOffsets[b + 1u] = sBucketOffsets[b] + atomicLoad(&sBucketCounts[b]);
    }
  }
  workgroupBarrier();

  // --- Phase 4: Scatter entries in bucket order ---
  for (var i = localIdx; i < count; i += WG_SIZE) {
    let entryIdx = tileEntries[overflowBase + i];
    let depth = bitcast<f32>(depthBuffer[entryIdx]);
    let bucket = min(u32((log(max(depth, 1e-6)) - logMin) * bucketScale), NUM_BUCKETS - 1u);
    let writePos = sBucketOffsets[bucket] + atomicAdd(&sBucketCursors[bucket], 1u);
    tileEntries[tileStart + writePos] = entryIdx;
  }
  workgroupBarrier();

  // --- Phase 5: Thread 0 packs buckets into chunks ---
  if (localIdx == 0u) {
    var chunkStart: u32 = 0u;
    var currentSize: u32 = 0u;
    let maxChunks = params.maxChunks;

    for (var b: u32 = 0u; b < NUM_BUCKETS; b++) {
      var bRemaining = sBucketOffsets[b + 1u] - sBucketOffsets[b];
      while (bRemaining > 0u) {
        let space = MAX_CHUNK_SIZE - currentSize;
        let take = min(bRemaining, space);
        currentSize += take;
        bRemaining -= take;

        if (currentSize == MAX_CHUNK_SIZE) {
          let cIdx = atomicAdd(&totalChunks[0], 1u);
          if (cIdx < maxChunks) {
            chunkRanges[cIdx * 2u] = tileStart + chunkStart;
            chunkRanges[cIdx * 2u + 1u] = currentSize;
          }
          chunkStart += currentSize;
          currentSize = 0u;
        }
      }
    }

    if (currentSize > 0u) {
      let cIdx = atomicAdd(&totalChunks[0], 1u);
      if (cIdx < maxChunks) {
        chunkRanges[cIdx * 2u] = tileStart + chunkStart;
        chunkRanges[cIdx * 2u + 1u] = currentSize;
      }
    }
  }
}
