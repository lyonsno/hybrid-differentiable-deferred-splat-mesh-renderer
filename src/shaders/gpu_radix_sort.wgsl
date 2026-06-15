// Global radix sort for tile-splat compositor.
// Sorts (key, value) pairs where key = (tileId << 16 | depth_u16).
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

// --- Scatter pass (stable via bitmask ranking) ---
// Stable parallel ranking using per-bucket bitmasks.
// Each thread sets its bit in its bucket's mask, then popcount below gives rank.
// 16 buckets × 8 u32s (256 bits each) = 128 u32 workgroup memory.
// O(1) per thread ranking + O(WG_SIZE/32) parallel bucket count.

var<workgroup> bucketBits: array<atomic<u32>, 128>; // 16 buckets × 8 words
var<workgroup> bucketBase: array<u32, 16>;           // base output offset per bucket
var<workgroup> bucketRunning: array<u32, 16>;        // running count per bucket

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
    // Clear bitmask (128 words, first 128 threads each clear one)
    if (localId.x < 128u) {
      atomicStore(&bucketBits[localId.x], 0u);
    }
    workgroupBarrier();

    let idx = groupStart + item * WG_SIZE + localId.x;

    var bucket = RADIX_BUCKETS; // sentinel: no valid element
    var key = 0xFFFFFFFFu;
    var value = 0u;

    if (idx < params.elementCount) {
      key = keysIn[idx];
      value = valuesIn[idx];
      bucket = (key >> params.bitOffset) & BUCKET_MASK;
    }

    // Set this thread's bit in its bucket's bitmask
    let wordIdx = localId.x >> 5u;  // localId.x / 32
    let bitIdx = localId.x & 31u;   // localId.x % 32
    if (bucket < RADIX_BUCKETS) {
      atomicOr(&bucketBits[bucket * 8u + wordIdx], 1u << bitIdx);
    }
    workgroupBarrier();

    // Compute stable rank: count set bits below this thread's position in its bucket
    var rank = 0u;
    if (bucket < RADIX_BUCKETS) {
      let bucketOffset = bucket * 8u;
      // Count all bits in words before this thread's word
      for (var w = 0u; w < wordIdx; w++) {
        rank += countOneBits(atomicLoad(&bucketBits[bucketOffset + w]));
      }
      // Count bits below this thread's position in its own word
      let myWord = atomicLoad(&bucketBits[bucketOffset + wordIdx]);
      let maskBelow = (1u << bitIdx) - 1u;
      rank += countOneBits(myWord & maskBelow);
    }

    // Scatter to output
    if (bucket < RADIX_BUCKETS) {
      let outIdx = bucketBase[bucket] + bucketRunning[bucket] + rank;
      keysOut[outIdx] = key;
      valuesOut[outIdx] = value;
    }
    workgroupBarrier();

    // Advance running counts — first 16 threads each handle one bucket
    if (localId.x < RADIX_BUCKETS) {
      let bucketOffset = localId.x * 8u;
      var count = 0u;
      for (var w = 0u; w < 8u; w++) {
        count += countOneBits(atomicLoad(&bucketBits[bucketOffset + w]));
      }
      bucketRunning[localId.x] += count;
    }
    workgroupBarrier();
  }
}
