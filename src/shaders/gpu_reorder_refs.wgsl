// Reorder tile refs after global radix sort.
// Reads the sorted permutation from the values buffer and copies ref records
// from unsorted to sorted positions.
//
// Standalone shader to stay within the 10 storage buffer per-stage limit.

struct ReorderParams {
  totalRefs: u32,
  refStride: u32,
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<uniform> params: ReorderParams;
@group(0) @binding(1) var<storage, read> sortedValues: array<u32>;
@group(0) @binding(2) var<storage, read> unsortedRefs: array<u32>;
@group(0) @binding(3) var<storage, read_write> sortedRefs: array<u32>;

@compute @workgroup_size(256)
fn reorder_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let dstIdx = globalId.x;
  if (dstIdx >= params.totalRefs) { return; }

  let srcIdx = sortedValues[dstIdx];
  let srcBase = srcIdx * params.refStride;
  let dstBase = dstIdx * params.refStride;

  for (var w = 0u; w < params.refStride; w++) {
    sortedRefs[dstBase + w] = unsortedRefs[srcBase + w];
  }
}
