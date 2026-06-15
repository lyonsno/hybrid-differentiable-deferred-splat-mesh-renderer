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

// --- Pass 6: Composite (shared-memory batched rasterizer, 2x2 pixel quads) ---
// One workgroup per tile. 8x8 threads = 64 threads, each owns a 2x2 pixel quad,
// covering a 16x16 tile. Each batch loads 64 splats from sorted refs into shared
// memory, then all 64 threads evaluate those splats against their quads.
//
// Iterates from end (nearest) to start (farthest) since sort key inverts depth.

const BATCH_SIZE = 64u;
const ALPHA_THRESHOLD = 1.0 / 255.0;
const TILE_PX = 16u;

var<workgroup> shCenter: array<vec2f, 64>;
var<workgroup> shCoeffs: array<vec3f, 64>;  // (covXX*-0.5, covYY*-0.5, -covXY)
var<workgroup> shColor: array<vec4f, 64>;   // (r, g, b, opacity)
var<workgroup> shTileRefCount: atomic<u32>; // for workgroupUniformLoad

@compute @workgroup_size(8, 8, 1)
fn composite(
  @builtin(local_invocation_id) lid: vec3u,
  @builtin(local_invocation_index) localIdx: u32,
  @builtin(workgroup_id) wid: vec3u,
  @builtin(num_workgroups) numWorkgroups: vec3u,
) {
  // One workgroup per tile. Tile index from workgroup ID.
  let workgroupIdx = wid.y * numWorkgroups.x + wid.x;
  let tileX = workgroupIdx % frame.tileGrid.x;
  let tileY = workgroupIdx / frame.tileGrid.x;
  if (tileY >= frame.tileGrid.y) { return; }
  let tileId = mortonEncode2D(tileX, tileY);

  // Each thread owns a 2x2 pixel quad
  let basePixel = vec2u(tileX * TILE_PX + lid.x * 2u, tileY * TILE_PX + lid.y * 2u);
  let p00 = vec2f(f32(basePixel.x) + 0.5, f32(basePixel.y) + 0.5);

  // Per-pixel transmittance and accumulated color (2x2 quad)
  var T = vec4f(1.0); // x=00, y=10, z=01, w=11
  var c00 = vec3f(0.0);
  var c10 = vec3f(0.0);
  var c01 = vec3f(0.0);
  var c11 = vec3f(0.0);

  let refStart = tileOffsets[tileId];
  // Copy tile count to workgroup atomic, then use workgroupUniformLoad to get a
  // uniform value for the loop bound (required for workgroupBarrier in the loop).
  if (localIdx == 0u) {
    atomicStore(&shTileRefCount, atomicLoad(&tileCounts[tileId]));
  }
  let refCount = workgroupUniformLoad(&shTileRefCount);
  let numBatches = (refCount + BATCH_SIZE - 1u) / BATCH_SIZE;
  var threadDone = false;

  // Iterate batches from end (nearest) to start (farthest).
  // Sort key inverts depth: near splats have high keys → sort to end of tile range.
  for (var batchIdx: u32 = 0u; batchIdx < numBatches; batchIdx++) {
    // Load one splat per thread into shared memory (from the END of the range)
    let refOffset = refCount - 1u - (batchIdx * BATCH_SIZE + localIdx);
    if (batchIdx * BATCH_SIZE + localIdx < refCount) {
      let refIdx = (refStart + refOffset) * TILE_REF_STRIDE;

      let splatId = tileRefs[refIdx + 0u];
      shCenter[localIdx] = vec2f(
        bitcast<f32>(tileRefs[refIdx + 2u]),
        bitcast<f32>(tileRefs[refIdx + 3u]),
      );
      // Store evaluation coefficients: cx*-0.5, cy*-0.5, -cxy
      let covX = bitcast<f32>(tileRefs[refIdx + 4u]);
      let covY = bitcast<f32>(tileRefs[refIdx + 5u]);
      let covZ = bitcast<f32>(tileRefs[refIdx + 6u]);
      shCoeffs[localIdx] = vec3f(covX * -0.5, covZ * -0.5, -covY);

      let opacity = bitcast<f32>(tileRefs[refIdx + 7u]);
      let colorBase = splatId * 3u;
      shColor[localIdx] = vec4f(
        colors[colorBase], colors[colorBase + 1u], colors[colorBase + 2u],
        opacity,
      );
    } else {
      // Sentinel: zero opacity → skipped by alpha threshold
      shColor[localIdx] = vec4f(0.0);
    }

    workgroupBarrier();

    if (!threadDone) {
      let batchCount = min(BATCH_SIZE, refCount - batchIdx * BATCH_SIZE);

      for (var i: u32 = 0u; i < batchCount; i++) {
        let center = shCenter[i];
        let coeffs = shCoeffs[i];
        let splatColor = shColor[i];

        // Vectorized Gaussian evaluation for the 2x2 quad
        let d = p00 - center;
        let dxV = vec4f(d.x, d.x + 1.0, d.x, d.x + 1.0);
        let dyV = vec4f(d.y, d.y, d.y + 1.0, d.y + 1.0);
        let power4 = coeffs.x * dxV * dxV + coeffs.z * dxV * dyV + coeffs.y * dyV * dyV;

        // Skip splat entirely if it contributes nothing to any of the 4 pixels
        if (all(power4 <= vec4f(-4.0))) {
          continue;
        }

        let gauss4 = exp(power4);
        let alpha4 = min(vec4f(0.99), vec4f(splatColor.a) * gauss4);
        let newT = T * (vec4f(1.0) - alpha4);

        let valid = (power4 > vec4f(-4.0)) & (alpha4 > vec4f(ALPHA_THRESHOLD)) & (T >= vec4f(TRANSMITTANCE_CUTOFF));
        let weight = alpha4 * T * select(vec4f(0.0), vec4f(1.0), valid);

        c00 += splatColor.rgb * weight.x;
        c10 += splatColor.rgb * weight.y;
        c01 += splatColor.rgb * weight.z;
        c11 += splatColor.rgb * weight.w;
        T = select(T, newT, valid);

        if (all(T < vec4f(TRANSMITTANCE_CUTOFF))) {
          threadDone = true;
          break;
        }
      }
    }

    workgroupBarrier();
  }

  // Write results for the 2x2 pixel quad
  let bgColor = vec3f(0.02, 0.02, 0.04);
  let outputSize = textureDimensions(outputColor);

  if (basePixel.x < outputSize.x && basePixel.y < outputSize.y) {
    textureStore(outputColor, vec2i(basePixel), vec4f(c00 + T.x * bgColor, 1.0));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y < outputSize.y) {
    textureStore(outputColor, vec2i(vec2u(basePixel.x + 1u, basePixel.y)), vec4f(c10 + T.y * bgColor, 1.0));
  }
  if (basePixel.x < outputSize.x && basePixel.y + 1u < outputSize.y) {
    textureStore(outputColor, vec2i(vec2u(basePixel.x, basePixel.y + 1u)), vec4f(c01 + T.z * bgColor, 1.0));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y + 1u < outputSize.y) {
    textureStore(outputColor, vec2i(vec2u(basePixel.x + 1u, basePixel.y + 1u)), vec4f(c11 + T.w * bgColor, 1.0));
  }
}
