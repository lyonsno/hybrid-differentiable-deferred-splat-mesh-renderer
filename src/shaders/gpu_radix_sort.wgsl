// Global radix sort for tile-splat compositor.
// Sorts (key, value) pairs where key = (tileId << 16) | depth_u16.
// 8-pass LSD radix sort, 4 bits per pass, 16 buckets.
// Stable scatter via per-thread ranking with 16-bucket prefix scan.

const WG_SIZE = 256u;
const RADIX_BITS = 4u;
const RADIX_BUCKETS = 16u; // 2^4
const ITEMS_PER_THREAD = 4u;
const ELEMENTS_PER_WG = 1024u; // WG_SIZE * ITEMS_PER_THREAD
const BUCKET_MASK = 15u; // RADIX_BUCKETS - 1

struct SortParams {
  elementCount: u32,
  bitOffset: u32,
  numWorkgroups: u32,
  _pad: u32,
};

@group(0) @binding(0) var<storage, read> keysIn: array<u32>;
@group(0) @binding(1) var<storage, read> valuesIn: array<u32>;
@group(0) @binding(2) var<storage, read_write> keysOut: array<u32>;
@group(0) @binding(3) var<storage, read_write> valuesOut: array<u32>;
@group(0) @binding(4) var<storage, read_write> globalHistogram: array<u32>;
@group(0) @binding(5) var<uniform> params: SortParams;

// --- Init pass ---
@compute @workgroup_size(256)
fn init_keys(@builtin(global_invocation_id) globalId: vec3u) {
  let idx = globalId.x;
  if (idx < params.elementCount) {
    keysOut[idx] = 0xFFFFFFFFu;
    valuesOut[idx] = idx;
  }
}

// --- Histogram pass ---
var<workgroup> localHist: array<atomic<u32>, 16>;

@compute @workgroup_size(256)
fn histogram(
  @builtin(local_invocation_id) localId: vec3u,
  @builtin(workgroup_id) groupId: vec3u,
) {
  // Clear local histogram (only first 16 threads)
  if (localId.x < RADIX_BUCKETS) {
    atomicStore(&localHist[localId.x], 0u);
  }
  workgroupBarrier();

  let groupStart = groupId.x * ELEMENTS_PER_WG;
  for (var item = 0u; item < ITEMS_PER_THREAD; item++) {
    let idx = groupStart + item * WG_SIZE + localId.x;
    if (idx < params.elementCount) {
      let bucket = (keysIn[idx] >> params.bitOffset) & BUCKET_MASK;
      atomicAdd(&localHist[bucket], 1u);
    }
  }
  workgroupBarrier();

  // Write to global histogram: interleaved [bucket * numWorkgroups + workgroupId]
  if (localId.x < RADIX_BUCKETS) {
    globalHistogram[localId.x * params.numWorkgroups + groupId.x] = atomicLoad(&localHist[localId.x]);
  }
}

// --- Scatter pass (stable via ranking) ---
// With only 16 buckets, ranking is cheap:
// For each thread's element, count how many prior threads (in this round)
// have the same bucket. With 256 threads this is O(256) per thread worst case,
// but we can use shared memory to broadcast bucket assignments.

var<workgroup> threadBuckets: array<u32, 256>; // bucket of each thread this round
var<workgroup> bucketBase: array<u32, 16>;     // base output offset per bucket
var<workgroup> bucketRunning: array<u32, 16>;  // running count per bucket

@compute @workgroup_size(256)
fn scatter(
  @builtin(local_invocation_id) localId: vec3u,
  @builtin(workgroup_id) groupId: vec3u,
) {
  // Load global prefix-summed offsets
  if (localId.x < RADIX_BUCKETS) {
    bucketBase[localId.x] = globalHistogram[localId.x * params.numWorkgroups + groupId.x];
    bucketRunning[localId.x] = 0u;
  }
  workgroupBarrier();

  let groupStart = groupId.x * ELEMENTS_PER_WG;

  for (var item = 0u; item < ITEMS_PER_THREAD; item++) {
    let idx = groupStart + item * WG_SIZE + localId.x;

    var bucket = RADIX_BUCKETS; // sentinel: no valid element
    var key = 0xFFFFFFFFu;
    var value = 0u;

    if (idx < params.elementCount) {
      key = keysIn[idx];
      value = valuesIn[idx];
      bucket = (key >> params.bitOffset) & BUCKET_MASK;
    }

    // Broadcast each thread's bucket
    threadBuckets[localId.x] = bucket;
    workgroupBarrier();

    // Compute rank: count threads with lower ID that have the same bucket
    var rank = 0u;
    if (bucket < RADIX_BUCKETS) {
      for (var t = 0u; t < localId.x; t++) {
        if (threadBuckets[t] == bucket) {
          rank += 1u;
        }
      }
    }

    // Scatter to output
    if (bucket < RADIX_BUCKETS) {
      let outIdx = bucketBase[bucket] + bucketRunning[bucket] + rank;
      keysOut[outIdx] = key;
      valuesOut[outIdx] = value;
    }
    workgroupBarrier();

    // Advance running counts (thread 0 does this)
    if (localId.x == 0u) {
      for (var b = 0u; b < RADIX_BUCKETS; b++) {
        var count = 0u;
        for (var t = 0u; t < WG_SIZE; t++) {
          if (threadBuckets[t] == b) {
            count += 1u;
          }
        }
        bucketRunning[b] += count;
      }
    }
    workgroupBarrier();
  }
}
