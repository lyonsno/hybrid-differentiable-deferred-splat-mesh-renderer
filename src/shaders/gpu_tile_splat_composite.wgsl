// Per-pixel Gaussian splat compositor — reference 3DGS projection.
//
// Pipeline: count → GPU prefix-sum → scatter (with sort keys) → global radix sort → reorder → composite
// Projection: viewProj Jacobian, viewport/2, +0.3 low-pass, exp(-0.5 * mahalanobis^2)
// Compositing: back-to-front source-over (matching hardware alpha blend order)
// Sorting: global radix sort on (tileId << 16 | depth_u16) — no per-tile size limit

struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  totalTileRefs: u32,
};

const TRANSMITTANCE_CUTOFF = 0.001;
const COMPACT_FOOTPRINT_SIGMA_RADIUS = 3.0;
const COMPACT_FOOTPRINT_EPSILON = 0.000000001;
const MIN_SPLAT_CLIP_W = 0.0001;
const COV_LOW_PASS = 0.3;

// Morton (Z-order) encoding for 2D tile coordinates.
// Interleaves bits of x and y so spatially adjacent tiles have adjacent codes.
// This improves cache locality during compositing and sorting.
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

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> projCache: array<u32>;
@group(0) @binding(2) var<storage, read> colors: array<f32>;
@group(0) @binding(3) var<storage, read> sortedIndices: array<u32>;

const PROJ_STRIDE = 8u;

@group(1) @binding(0) var<storage, read_write> tileCounts: array<atomic<u32>>;
@group(1) @binding(1) var<storage, read_write> tileOffsets: array<u32>;
@group(1) @binding(2) var<storage, read_write> tileRefs: array<u32>;
@group(1) @binding(3) var outputColor: texture_storage_2d<rgba16float, write>;

const TILE_REF_STRIDE = 8u;

// --- Pass 1: Count (reads tile bounds from projection cache) ---
@compute @workgroup_size(256)
fn count_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let sortRank = globalId.x;
  if (sortRank >= frame.splatCount) { return; }

  let packed = projCache[sortRank * PROJ_STRIDE + 7u];
  if (packed == 0xFFFFFFFFu) { return; } // invisible sentinel

  let minTileX = packed & 0xFFu;
  let minTileY = (packed >> 8u) & 0xFFu;
  let maxTileX = (packed >> 16u) & 0xFFu;
  let maxTileY = (packed >> 24u) & 0xFFu;

  for (var tileY = minTileY; tileY <= maxTileY; tileY++) {
    for (var tileX = minTileX; tileX <= maxTileX; tileX++) {
      let tileId = mortonEncode2D(tileX, tileY);
      atomicAdd(&tileCounts[tileId], 1u);
    }
  }
}

// --- Pass 3: Scatter (reads from projection cache) ---
// Writes ref data into tileRefs AND sort keys for global radix sort.
// Values buffer is pre-initialized with identity by radix sort init pass.

@group(2) @binding(0) var<storage, read_write> radixKeys: array<u32>;

@compute @workgroup_size(256)
fn scatter_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let sortRank = globalId.x;
  if (sortRank >= frame.splatCount) { return; }

  let cacheBase = sortRank * PROJ_STRIDE;
  let packed = projCache[cacheBase + 7u];
  if (packed == 0xFFFFFFFFu) { return; } // invisible sentinel

  // Read projected data from cache
  let centerPxX = projCache[cacheBase + 0u];
  let centerPxY = projCache[cacheBase + 1u];
  let covX = projCache[cacheBase + 2u];
  let covY = projCache[cacheBase + 3u];
  let covZ = projCache[cacheBase + 4u];
  let radiusDepth = unpack2x16float(projCache[cacheBase + 5u]);
  let opacityPacked = unpack2x16float(projCache[cacheBase + 6u]);
  let depthNdc = radiusDepth.y;
  let opacity = opacityPacked.x;

  // Read tile bounds from cache
  let minTileX = packed & 0xFFu;
  let minTileY = (packed >> 8u) & 0xFFu;
  let maxTileX = (packed >> 16u) & 0xFFu;
  let maxTileY = (packed >> 24u) & 0xFFu;

  // Quantize depth to 16 bits for sort key.
  let depthClamped = clamp(depthNdc, 0.0, 1.0);
  let depthU16 = u32(depthClamped * 65535.0);
  let depthInverted = 65535u - depthU16;

  let splatId = sortedIndices[sortRank];

  for (var tileY = minTileY; tileY <= maxTileY; tileY++) {
    for (var tileX = minTileX; tileX <= maxTileX; tileX++) {
      let tileId = mortonEncode2D(tileX, tileY);
      let slot = atomicAdd(&tileCounts[tileId], 1u);
      let baseOffset = tileOffsets[tileId];
      let linearIdx = baseOffset + slot;
      let refIdx = linearIdx * TILE_REF_STRIDE;
      if (refIdx + TILE_REF_STRIDE <= frame.totalTileRefs * TILE_REF_STRIDE) {
        // Write ref data (populated from projection cache)
        tileRefs[refIdx + 0u] = splatId;
        tileRefs[refIdx + 1u] = bitcast<u32>(depthNdc);
        tileRefs[refIdx + 2u] = centerPxX;
        tileRefs[refIdx + 3u] = centerPxY;
        tileRefs[refIdx + 4u] = covX;
        tileRefs[refIdx + 5u] = covY;
        tileRefs[refIdx + 6u] = covZ;
        tileRefs[refIdx + 7u] = bitcast<u32>(opacity);

        // Write radix sort key: Morton-coded tileId for spatial locality + inverted depth
        radixKeys[linearIdx] = (tileId << 16u) | depthInverted;
      }
    }
  }
}

// Reorder pass is a separate shader (gpu_reorder_refs.wgsl) to reduce bind group count.

// --- Pass 6: Composite (front-to-back with transmittance cutoff) ---
// Reads from tileRefs which is bound to the sorted buffer at composite time.
// tileOffsets and tileCounts define per-tile ranges.
// The radix sort preserved tile grouping (tileId is the upper 16 bits of the sort key).
//
// Iterates refs from nearest to farthest (end of sorted range = nearest because
// sort key inverts depth). Accumulates color front-to-back and stops when
// transmittance drops below threshold, skipping the majority of occluded back splats.

@compute @workgroup_size(8, 8, 1)
fn composite(@builtin(global_invocation_id) globalId: vec3u) {
  let outputSize = textureDimensions(outputColor);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) { return; }

  let tileSizePx = max(u32(frame.tileSizePx), 1u);
  let tileX = min(globalId.x / tileSizePx, frame.tileGrid.x - 1u);
  let tileY = min(globalId.y / tileSizePx, frame.tileGrid.y - 1u);
  let tileId = mortonEncode2D(tileX, tileY);
  let pixelCenter = vec2f(f32(globalId.x) + 0.5, f32(globalId.y) + 0.5);

  let refStart = tileOffsets[tileId];
  let refCount = atomicLoad(&tileCounts[tileId]);

  // Front-to-back compositing: accumulate premultiplied color and transmittance.
  // T starts at 1.0 (fully transparent), decreases as splats occlude.
  var accColor = vec3f(0.0);
  var T = 1.0;

  // Iterate from end (nearest splats) to start (farthest).
  // Sort key = (tileId << 16) | depthInverted, where depthInverted = 65535 - depthU16.
  // Near splats have high depthInverted → sort to end of tile range.
  for (var i = refCount; i > 0u; i--) {
    let refIdx = (refStart + i - 1u) * TILE_REF_STRIDE;
    if (refIdx + TILE_REF_STRIDE > frame.totalTileRefs * TILE_REF_STRIDE) { continue; }

    let splatId = tileRefs[refIdx + 0u];
    if (splatId >= frame.splatCount) { continue; }

    let centerPx = vec2f(
      bitcast<f32>(tileRefs[refIdx + 2u]),
      bitcast<f32>(tileRefs[refIdx + 3u]),
    );
    let con = vec3f(
      bitcast<f32>(tileRefs[refIdx + 4u]),
      bitcast<f32>(tileRefs[refIdx + 5u]),
      bitcast<f32>(tileRefs[refIdx + 6u]),
    );
    let opacity = bitcast<f32>(tileRefs[refIdx + 7u]);

    let d = pixelCenter - centerPx;
    let power = -0.5 * (con.x * d.x * d.x + con.z * d.y * d.y) - con.y * d.x * d.y;
    if (power > 0.0) { continue; }

    let alpha = min(opacity * exp(power), 0.99);
    if (alpha < 1.0 / 255.0) { continue; }

    let colorBase = splatId * 3u;
    let sourceColor = vec3f(colors[colorBase], colors[colorBase + 1u], colors[colorBase + 2u]);

    // Front-to-back: color += T * alpha * sourceColor; T *= (1 - alpha)
    accColor += T * alpha * sourceColor;
    T *= (1.0 - alpha);

    // Early-out when transmittance is exhausted
    if (T < TRANSMITTANCE_CUTOFF) { break; }
  }

  // Blend remaining transmittance with background
  let bgColor = vec3f(0.02, 0.02, 0.04);
  let finalColor = accColor + T * bgColor;

  textureStore(outputColor, vec2i(globalId.xy), vec4f(finalColor, 1.0));
}
