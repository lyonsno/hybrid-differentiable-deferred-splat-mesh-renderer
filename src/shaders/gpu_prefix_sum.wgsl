// Simple exclusive prefix sum for up to 65536 elements.
// Uses a two-pass approach: each workgroup scans 256 elements,
// then a second pass adds the block sums.

@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<storage, read_write> blockSums: array<u32>;
@group(0) @binding(3) var<uniform> params: vec4u; // x = element count, y = pass (0=scan, 1=add)

var<workgroup> scanBuf: array<u32, 512>;

@compute @workgroup_size(256)
fn scan(@builtin(global_invocation_id) globalId: vec3u, @builtin(local_invocation_id) localId: vec3u, @builtin(workgroup_id) groupId: vec3u) {
  let elementCount = params.x;
  let idx = globalId.x;

  // Load into shared memory
  let val = select(0u, input[idx], idx < elementCount);
  scanBuf[localId.x] = val;
  workgroupBarrier();

  // Hillis-Steele inclusive scan within workgroup
  for (var stride = 1u; stride < 256u; stride *= 2u) {
    let partner = select(0u, scanBuf[localId.x - stride], localId.x >= stride);
    workgroupBarrier();
    scanBuf[localId.x] = scanBuf[localId.x] + partner;
    workgroupBarrier();
  }

  // Convert to exclusive scan and write output
  let exclusive = select(0u, scanBuf[localId.x - 1u], localId.x > 0u);
  if (idx < elementCount) {
    output[idx] = exclusive;
  }

  // Last thread in workgroup writes block sum
  if (localId.x == 255u) {
    blockSums[groupId.x] = scanBuf[255u];
  }
}

@compute @workgroup_size(256)
fn add_block_sums(@builtin(global_invocation_id) globalId: vec3u, @builtin(workgroup_id) groupId: vec3u) {
  let elementCount = params.x;
  let idx = globalId.x;
  if (idx >= elementCount || groupId.x == 0u) {
    return;
  }

  // Scan block sums (simple serial scan — only up to 256 blocks)
  var blockOffset = 0u;
  for (var b = 0u; b < groupId.x; b++) {
    blockOffset += blockSums[b];
  }

  output[idx] = output[idx] + blockOffset;
}
