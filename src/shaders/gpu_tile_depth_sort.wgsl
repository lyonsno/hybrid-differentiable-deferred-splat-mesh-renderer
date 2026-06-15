// Per-tile depth sort using bitonic sort with logarithmic depth quantization.
// Adapted from PlayCanvas engine gsplat-local-bitonic.js (MIT license).
//
// Each tile entry is 1 u32 (sortRank = projection cache index). Depths are
// read from a separate depthBuffer indexed by sortRank. The sort reorders
// tile entries in-place so they're ascending by depth (near first).
//
// Supports up to 4096 entries per tile (16KB shared memory).
// Logarithmic depth quantization adapts precision to each tile's range.
//
// Dispatch: (tileColumns, tileRows). One workgroup per tile.

const BITONIC_WG_SIZE = 256u;
const MAX_TILE_ENTRIES = 4096u;
const INDEX_BITS = 12u;
const INDEX_MASK = 0xFFFu;
const DEPTH_LEVELS: f32 = 1048575.0; // 2^20 - 1

struct TileSortParams {
  mortonTileCount: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<uniform> params: TileSortParams;
@group(0) @binding(1) var<storage, read> tileOffsets: array<u32>;
@group(0) @binding(2) var<storage, read> tileCounts: array<u32>;
@group(0) @binding(3) var<storage, read_write> tileEntries: array<u32>;
@group(0) @binding(4) var<storage, read> depthBuffer: array<u32>;

fn mortonEncode2D(x: u32, y: u32) -> u32 {
  var mx = x & 0xFFFFu;
  mx = (mx | (mx << 8u)) & 0x00FF00FFu;
  mx = (mx | (mx << 4u)) & 0x0F0F0F0Fu;
  mx = (mx | (mx << 2u)) & 0x33333333u;
  mx = (mx | (mx << 1u)) & 0x55555555u;
  var my = y & 0xFFFFu;
  my = (my | (my << 8u)) & 0x00FF00FFu;
  my = (my | (my << 4u)) & 0x0F0F0F0Fu;
  my = (my | (my << 2u)) & 0x33333333u;
  my = (my | (my << 1u)) & 0x55555555u;
  return mx | (my << 1u);
}

fn insertZeroBit(v: u32, bitPos: u32) -> u32 {
  let mask = (1u << bitPos) - 1u;
  return ((v >> bitPos) << (bitPos + 1u)) | (v & mask);
}

var<workgroup> sData: array<u32, 4096>;
var<workgroup> sDepthMin: atomic<u32>;
var<workgroup> sDepthMax: atomic<u32>;
var<workgroup> shTileCount: atomic<u32>;

@compute @workgroup_size(256)
fn tile_depth_sort(
  @builtin(workgroup_id) groupId: vec3u,
  @builtin(local_invocation_index) localIdx: u32,
) {
  let tileX = groupId.x;
  let tileY = groupId.y;
  let mortonId = mortonEncode2D(tileX, tileY);

  if (mortonId >= params.mortonTileCount) { return; }

  let tileStart = tileOffsets[mortonId];

  if (localIdx == 0u) {
    atomicStore(&shTileCount, tileCounts[mortonId]);
  }
  let tileRefCount = workgroupUniformLoad(&shTileCount);
  if (tileRefCount <= 1u) { return; }

  let count = min(tileRefCount, MAX_TILE_ENTRIES);

  // --- Phase 1: Load depths into shared memory ---
  if (localIdx == 0u) {
    atomicStore(&sDepthMin, 0xFFFFFFFFu);
    atomicStore(&sDepthMax, 0u);
  }

  var sortN: u32 = 1u;
  while (sortN < count) {
    sortN = sortN << 1u;
  }

  for (var i: u32 = localIdx; i < sortN; i += BITONIC_WG_SIZE) {
    if (i < count) {
      let sortRank = tileEntries[tileStart + i];
      sData[i] = depthBuffer[sortRank];
    } else {
      sData[i] = 0xFFFFFFFFu;
    }
  }

  workgroupBarrier();

  // --- Phase 2: Per-tile min/max depth reduction ---
  for (var i: u32 = localIdx; i < count; i += BITONIC_WG_SIZE) {
    atomicMin(&sDepthMin, sData[i]);
    atomicMax(&sDepthMax, sData[i]);
  }

  workgroupBarrier();

  let depthMin = bitcast<f32>(atomicLoad(&sDepthMin));
  let depthMax = bitcast<f32>(atomicLoad(&sDepthMax));

  let logMin = log(max(depthMin, 1e-6));
  let logRange = log(max(depthMax, 1e-6)) - logMin;
  let invLogRange = select(DEPTH_LEVELS / logRange, 0.0, logRange < 1e-10);

  // --- Phase 3: Repack to (depth20 << 12 | localIndex12) ---
  for (var i: u32 = localIdx; i < sortN; i += BITONIC_WG_SIZE) {
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

  // --- Phase 4: Bitonic sort on packed values ---
  for (var k: u32 = 2u; k <= sortN; k = k << 1u) {
    for (var j: u32 = k >> 1u; j > 0u; j = j >> 1u) {
      let bitPos = countTrailingZeros(j);
      let halfN = sortN >> 1u;
      for (var c: u32 = localIdx; c < halfN; c += BITONIC_WG_SIZE) {
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

  // --- Phase 5: Extract sorted local indices → gather original entries → write back ---
  // Two-pass: first read original entries by sorted index, then write.
  for (var i: u32 = localIdx; i < count; i += BITONIC_WG_SIZE) {
    let localIndex = sData[i] & INDEX_MASK;
    sData[i] = tileEntries[tileStart + localIndex];
  }

  workgroupBarrier();

  for (var i: u32 = localIdx; i < count; i += BITONIC_WG_SIZE) {
    tileEntries[tileStart + i] = sData[i];
  }
}
