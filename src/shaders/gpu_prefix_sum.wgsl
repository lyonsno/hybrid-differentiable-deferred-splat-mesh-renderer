// Hierarchical exclusive prefix sum.
// Pass 1 (scan): each workgroup scans 256 elements via Hillis-Steele,
//   writes per-element exclusive prefix to output and block total to blockSums.
// Pass 2 (scan_block_sums): single workgroup scans blockSums in-place.
// Pass 3 (propagate): each element adds its block's prefix from blockSums.

@group(0) @binding(0) var<storage, read> input: array<u32>;
@group(0) @binding(1) var<storage, read_write> output: array<u32>;
@group(0) @binding(2) var<storage, read_write> blockSums: array<u32>;
@group(0) @binding(3) var<uniform> params: vec4u; // x = element count

var<workgroup> scanBuf: array<u32, 256>;

@compute @workgroup_size(256)
fn scan(
  @builtin(global_invocation_id) globalId: vec3u,
  @builtin(local_invocation_id) localId: vec3u,
  @builtin(workgroup_id) groupId: vec3u,
) {
  let elementCount = params.x;
  let idx = globalId.x;

  let val = select(0u, input[idx], idx < elementCount);
  scanBuf[localId.x] = val;
  workgroupBarrier();

  // Hillis-Steele inclusive scan
  for (var stride = 1u; stride < 256u; stride *= 2u) {
    let partner = select(0u, scanBuf[localId.x - stride], localId.x >= stride);
    workgroupBarrier();
    scanBuf[localId.x] = scanBuf[localId.x] + partner;
    workgroupBarrier();
  }

  // Exclusive prefix = inclusive prefix of predecessor
  let exclusive = select(0u, scanBuf[localId.x - 1u], localId.x > 0u);
  if (idx < elementCount) {
    output[idx] = exclusive;
  }

  // Block total
  if (localId.x == 255u) {
    blockSums[groupId.x] = scanBuf[255u];
  }
}

// Scan the block sums themselves (single workgroup, up to 256 blocks).
// After this pass, blockSums[i] = exclusive prefix sum of original block totals.
@compute @workgroup_size(256)
fn scan_block_sums(
  @builtin(local_invocation_id) localId: vec3u,
) {
  let blockCount = (params.x + 255u) / 256u;

  let val = select(0u, blockSums[localId.x], localId.x < blockCount);
  scanBuf[localId.x] = val;
  workgroupBarrier();

  for (var stride = 1u; stride < 256u; stride *= 2u) {
    let partner = select(0u, scanBuf[localId.x - stride], localId.x >= stride);
    workgroupBarrier();
    scanBuf[localId.x] = scanBuf[localId.x] + partner;
    workgroupBarrier();
  }

  let exclusive = select(0u, scanBuf[localId.x - 1u], localId.x > 0u);
  if (localId.x < blockCount) {
    blockSums[localId.x] = exclusive;
  }
}

// Add the scanned block prefix to each element (skip block 0, already correct).
@compute @workgroup_size(256)
fn add_block_sums(
  @builtin(global_invocation_id) globalId: vec3u,
  @builtin(workgroup_id) groupId: vec3u,
) {
  let elementCount = params.x;
  let idx = globalId.x;
  if (idx >= elementCount || groupId.x == 0u) {
    return;
  }

  output[idx] = output[idx] + blockSums[groupId.x];
}
