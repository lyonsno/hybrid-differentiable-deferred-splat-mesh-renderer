// Per-tile depth sort using odd-even transposition on global memory.
// After the global radix sort groups refs by Morton tile ID, this pass
// sorts each tile's refs by depth (slot 1) with full f32 precision.
//
// Dispatch: (tileColumns, tileRows). One workgroup per tile.
// 256 threads, each handles one compare-swap pair per round.
// Sorts up to 512 refs per tile (512 rounds). Tiles with >512 refs
// get their first 512 sorted; transmittance cutoff handles the rest.

const WG_SIZE = 256u;
const SORT_CAP = 512u;
const REF_STRIDE = 8u;

struct TileSortParams {
  mortonTileCount: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<uniform> params: TileSortParams;
@group(0) @binding(1) var<storage, read> tileOffsets: array<u32>;
@group(0) @binding(2) var<storage, read> tileCounts: array<u32>;
@group(0) @binding(3) var<storage, read_write> sortedRefs: array<u32>;

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

// Shared memory for depth keys — sort in shared, swap in global.
var<workgroup> sDepth: array<u32, 512>;
var<workgroup> shTileCount: atomic<u32>;

@compute @workgroup_size(256)
fn tile_depth_sort(
  @builtin(workgroup_id) groupId: vec3u,
  @builtin(local_invocation_id) localId: vec3u,
  @builtin(local_invocation_index) localIdx: u32,
) {
  let tileX = groupId.x;
  let tileY = groupId.y;
  let mortonId = mortonEncode2D(tileX, tileY);

  if (mortonId >= params.mortonTileCount) { return; }

  let tileStart = tileOffsets[mortonId];

  // Load tile count uniformly via workgroupUniformLoad
  if (localIdx == 0u) {
    atomicStore(&shTileCount, tileCounts[mortonId]);
  }
  let tileRefCount = workgroupUniformLoad(&shTileCount);
  if (tileRefCount <= 1u) { return; }

  let sortCount = min(tileRefCount, SORT_CAP);
  let lid = localId.x;

  // Load depth keys into shared memory
  for (var e = 0u; e < 2u; e++) {
    let si = lid * 2u + e;
    if (si < sortCount) {
      sDepth[si] = sortedRefs[(tileStart + si) * REF_STRIDE + 1u];
    } else {
      sDepth[si] = 0xFFFFFFFFu;
    }
  }
  workgroupBarrier();

  // Odd-even transposition sort on depth keys in shared memory
  for (var round = 0u; round < sortCount; round++) {
    let phase = round & 1u;
    let i = lid * 2u + phase;
    let j = i + 1u;

    if (j < sortCount && sDepth[i] > sDepth[j]) {
      // Swap depth keys in shared memory
      let tk = sDepth[i]; sDepth[i] = sDepth[j]; sDepth[j] = tk;

      // Swap full 8-u32 ref records in global memory
      let baseI = (tileStart + i) * REF_STRIDE;
      let baseJ = (tileStart + j) * REF_STRIDE;
      for (var w = 0u; w < REF_STRIDE; w++) {
        let tmp = sortedRefs[baseI + w];
        sortedRefs[baseI + w] = sortedRefs[baseJ + w];
        sortedRefs[baseJ + w] = tmp;
      }
    }
    workgroupBarrier();
  }
}
