// Classify projected splats as small or large based on tile footprint.
// Runs after the projection pass. Large splats (>16 tiles) get appended
// to a list for cooperative scatter.
//
// Dispatch: ceil(splatCount / 256) workgroups.

struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  totalTileRefs: u32,
};

const PROJ_STRIDE = 9u;
const LARGE_SPLAT_TILE_THRESHOLD = 16u;

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> projCache: array<u32>;

@group(1) @binding(0) var<storage, read_write> largeSplatList: array<u32>;
@group(1) @binding(1) var<storage, read_write> largeSplatCount: array<atomic<u32>>;

@compute @workgroup_size(256)
fn classify_large_splats(@builtin(global_invocation_id) globalId: vec3u) {
  let sortRank = globalId.x;
  if (sortRank >= frame.splatCount) { return; }

  let packed = projCache[sortRank * PROJ_STRIDE + 7u];
  if (packed == 0xFFFFFFFFu) { return; }

  let minTileX = packed & 0xFFu;
  let minTileY = (packed >> 8u) & 0xFFu;
  let maxTileX = (packed >> 16u) & 0xFFu;
  let maxTileY = (packed >> 24u) & 0xFFu;

  let spanX = maxTileX - minTileX + 1u;
  let spanY = maxTileY - minTileY + 1u;

  if (spanX * spanY > LARGE_SPLAT_TILE_THRESHOLD) {
    let idx = atomicAdd(&largeSplatCount[0], 1u);
    largeSplatList[idx] = sortRank;
  }
}
