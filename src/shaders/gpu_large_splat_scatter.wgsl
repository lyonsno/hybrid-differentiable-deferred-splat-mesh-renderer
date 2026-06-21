// Cooperative large-splat scatter: one workgroup per large splat.
// Each thread handles a subset of the splat's tile footprint, parallelizing
// the atomic scatter that would otherwise serialize in one thread.
//
// Dispatch: ceil(largeSplatCount / 1) workgroups (one workgroup per large splat).
// Uses indirect dispatch from the large splat count.

struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  totalTileRefs: u32,
  splatScale: f32,
  shDegree: u32,
  _pad0: vec2u,
  cameraPos: vec3f,
  _pad1: f32,
};

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

const PROJ_STRIDE = 13u;
const WG_SIZE = 64u;

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> projCache: array<u32>;

@group(1) @binding(0) var<storage, read_write> tileCounts: array<atomic<u32>>;
@group(1) @binding(1) var<storage, read_write> tileOffsets: array<u32>;
@group(1) @binding(2) var<storage, read_write> tileEntries: array<u32>;

@group(2) @binding(0) var<storage, read> largeSplatList: array<u32>;
@group(2) @binding(1) var<storage, read> largeSplatCount: array<u32>;

@compute @workgroup_size(64)
fn main(
  @builtin(workgroup_id) wid: vec3u,
  @builtin(local_invocation_index) localIdx: u32,
) {
  let largeSplatIdx = wid.x;
  if (largeSplatIdx >= largeSplatCount[0]) { return; }

  let sortRank = largeSplatList[largeSplatIdx];
  let cacheBase = sortRank * PROJ_STRIDE;
  let packed = projCache[cacheBase + 7u];

  // Unpack tile bounds
  let minTileX = packed & 0xFFu;
  let minTileY = (packed >> 8u) & 0xFFu;
  let maxTileX = (packed >> 16u) & 0xFFu;
  let maxTileY = (packed >> 24u) & 0xFFu;

  let spanX = maxTileX - minTileX + 1u;
  let spanY = maxTileY - minTileY + 1u;
  let totalTiles = spanX * spanY;

  // Each thread handles tiles at stride WG_SIZE
  for (var i = localIdx; i < totalTiles; i += WG_SIZE) {
    let localTileX = i % spanX;
    let localTileY = i / spanX;
    let tileX = minTileX + localTileX;
    let tileY = minTileY + localTileY;

    let tileId = mortonEncode2D(tileX, tileY);
    let slot = atomicAdd(&tileCounts[tileId], 1u);
    let baseOffset = tileOffsets[tileId];
    let linearIdx = baseOffset + slot;
    if (linearIdx < frame.totalTileRefs) {
      tileEntries[linearIdx] = sortRank;
    }
  }
}
