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
  splatScale: f32,
  shDegree: u32,
  _pad0: vec2u,
  cameraPos: vec3f,
  _pad1: f32,
};

const TRANSMITTANCE_CUTOFF = 0.001;
const COMPACT_FOOTPRINT_SIGMA_RADIUS = 3.0;
const COMPACT_FOOTPRINT_EPSILON = 0.000000001;
const MIN_SPLAT_CLIP_W = 0.0001;
const COV_LOW_PASS = 0.3;
const LARGE_SPLAT_TILE_THRESHOLD = 16u;

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
@group(0) @binding(2) var<storage, read> sortedIndices: array<u32>;

const PROJ_STRIDE = 14u;

@group(1) @binding(0) var<storage, read_write> tileCounts: array<atomic<u32>>;
@group(1) @binding(1) var<storage, read_write> tileOffsets: array<u32>;
@group(1) @binding(2) var<storage, read_write> tileEntries: array<u32>; // 1 u32 per entry: sortRank
@group(1) @binding(3) var outputColor: texture_storage_2d<rgba16float, write>;
@group(1) @binding(4) var<storage, read> depthBuffer: array<u32>; // full f32 depth per visible splat
@group(1) @binding(5) var outputDepth: texture_storage_2d<r32float, write>;
@group(1) @binding(6) var outputNormal: texture_storage_2d<r32uint, write>;
@group(1) @binding(7) var outputMaterial: texture_storage_2d<rgba32uint, write>; // .r=pack2x16float(roughness,metalness), .g=pack2x16float(emissive_rg), .b=pack2x16float(emissive_b,0)

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
// Writes tile refs at prefix-summed offsets. Per-tile depth sort handles ordering.

@compute @workgroup_size(256)
fn scatter_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let sortRank = globalId.x;
  if (sortRank >= frame.splatCount) { return; }

  let cacheBase = sortRank * PROJ_STRIDE;
  let packed = projCache[cacheBase + 7u];
  if (packed == 0xFFFFFFFFu) { return; } // invisible sentinel

  let minTileX = packed & 0xFFu;
  let minTileY = (packed >> 8u) & 0xFFu;
  let maxTileX = (packed >> 16u) & 0xFFu;
  let maxTileY = (packed >> 24u) & 0xFFu;

  // Skip large splats — handled by cooperative large-splat scatter pass
  let spanX = maxTileX - minTileX + 1u;
  let spanY = maxTileY - minTileY + 1u;
  if (spanX * spanY > LARGE_SPLAT_TILE_THRESHOLD) { return; }

  for (var tileY = minTileY; tileY <= maxTileY; tileY++) {
    for (var tileX = minTileX; tileX <= maxTileX; tileX++) {
      let tileId = mortonEncode2D(tileX, tileY);
      let slot = atomicAdd(&tileCounts[tileId], 1u);
      let baseOffset = tileOffsets[tileId];
      let linearIdx = baseOffset + slot;
      if (linearIdx < frame.totalTileRefs) {
        tileEntries[linearIdx] = sortRank;
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

fn octEncode(n: vec3f) -> vec2f {
  let sum = abs(n.x) + abs(n.y) + abs(n.z);
  var p = n.xy / sum;
  if (n.z < 0.0) {
    p = (1.0 - abs(p.yx)) * select(vec2f(-1.0), vec2f(1.0), p >= vec2f(0.0));
  }
  return p;
}

fn octDecode(e: vec2f) -> vec3f {
  var n = vec3f(e.xy, 1.0 - abs(e.x) - abs(e.y));
  if (n.z < 0.0) {
    n = vec3f((1.0 - abs(n.yx)) * select(vec2f(-1.0), vec2f(1.0), n.xy >= vec2f(0.0)), n.z);
  }
  return normalize(n);
}


var<workgroup> shCenter: array<vec2f, 64>;
var<workgroup> shCoeffs: array<vec3f, 64>;  // (covXX*-0.5, covYY*-0.5, -covXY)
var<workgroup> shColor: array<vec4f, 64>;   // (r, g, b, opacity)
var<workgroup> shMaterial: array<vec2f, 64>; // (roughness, metalness) per splat
var<workgroup> shNormal: array<vec3f, 64>;   // decoded unit normal per splat
var<workgroup> shNormalConfidence: array<f32, 64>;
var<workgroup> shDepth: array<f32, 64>;       // depthNdc per splat
var<workgroup> shEmissive: array<vec3f, 64>; // per-splat emissive RGB
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

  // G-buffer: alpha-weighted voting for depth, normal, and material (2x2 quad)
  var gbDepthWeighted = vec4f(0.0); // sum(alpha_weight * depth)
  var gbWeightSum = vec4f(0.0);     // sum(alpha_weight)
  var gbMatWeighted = mat4x2f();     // 4 pixels × (roughness, metalness) weighted sum
  var gbNrmWeighted0 = vec3f(0.0);  // pixel (0,0) normal weighted sum
  var gbNrmWeighted1 = vec3f(0.0);  // pixel (1,0)
  var gbNrmWeighted2 = vec3f(0.0);  // pixel (0,1)
  var gbNrmWeighted3 = vec3f(0.0);  // pixel (1,1)
  var gbNormalConfidenceWeighted = vec4f(0.0);

  // Emissive accumulation (alpha-weighted, 2x2 quad)
  var em00 = vec3f(0.0);
  var em10 = vec3f(0.0);
  var em01 = vec3f(0.0);
  var em11 = vec3f(0.0);

  let refStart = tileOffsets[tileId];
  // Copy tile count to workgroup atomic, then use workgroupUniformLoad to get a
  // uniform value for the loop bound (required for workgroupBarrier in the loop).
  if (localIdx == 0u) {
    atomicStore(&shTileRefCount, atomicLoad(&tileCounts[tileId]));
  }
  let refCount = workgroupUniformLoad(&shTileRefCount);
  let numBatches = (refCount + BATCH_SIZE - 1u) / BATCH_SIZE;
  var threadDone = false;

  // Iterate batches forward (nearest first).
  // Per-tile depth sort orders ascending: near splats at the start of tile range.
  for (var batchIdx: u32 = 0u; batchIdx < numBatches; batchIdx++) {
    // Load one splat per thread into shared memory from projection cache
    let entryOffset = batchIdx * BATCH_SIZE + localIdx;
    if (entryOffset < refCount) {
      let sortRank = tileEntries[refStart + entryOffset];
      let cacheBase = sortRank * PROJ_STRIDE;

      shCenter[localIdx] = vec2f(
        bitcast<f32>(projCache[cacheBase + 0u]),
        bitcast<f32>(projCache[cacheBase + 1u]),
      );
      // Store evaluation coefficients: cx*-0.5, cy*-0.5, -cxy
      let covX = bitcast<f32>(projCache[cacheBase + 2u]);
      let covY = bitcast<f32>(projCache[cacheBase + 3u]);
      let covZ = bitcast<f32>(projCache[cacheBase + 4u]);
      shCoeffs[localIdx] = vec3f(covX * -0.5, covZ * -0.5, -covY);

      let radiusOpacity = unpack2x16float(projCache[cacheBase + 6u]);
      let opacity = radiusOpacity.y;

      // Read SH-evaluated color from projection cache
      let colorRG = unpack2x16float(projCache[cacheBase + 9u]);
      let colorB = unpack2x16float(projCache[cacheBase + 10u]).x;
      shColor[localIdx] = vec4f(colorRG.x, colorRG.y, colorB, opacity);
      shMaterial[localIdx] = unpack2x16float(projCache[cacheBase + 5u]); // (roughness, metalness)
      shNormal[localIdx] = octDecode(unpack2x16float(projCache[cacheBase + 8u])); // per-splat normal
      shNormalConfidence[localIdx] = unpack2x16float(projCache[cacheBase + 13u]).x;
      shDepth[localIdx] = bitcast<f32>(depthBuffer[sortRank]);
      let emRG = unpack2x16float(projCache[cacheBase + 11u]);
      let emB = unpack2x16float(projCache[cacheBase + 12u]).x;
      shEmissive[localIdx] = vec3f(emRG.x, emRG.y, emB);
    } else {
      shColor[localIdx] = vec4f(0.0);
      shMaterial[localIdx] = vec2f(0.75, 0.0); // default: rough dielectric
      shNormal[localIdx] = vec3f(0.0, 1.0, 0.0); // default up
      shNormalConfidence[localIdx] = 1.0;
      shDepth[localIdx] = 1.0;
      shEmissive[localIdx] = vec3f(0.0);
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

        // G-buffer: alpha-weighted voting for depth, normal, and material.
        // Gate on minimum weight to suppress ghost splats at silhouette edges.
        let splatDepth = shDepth[i];
        let splatMat = shMaterial[i]; // (roughness, metalness)
        let splatNrm = shNormal[i];  // unit normal
        let gbValid = weight > vec4f(0.01);
        let gbWeight = select(vec4f(0.0), weight, gbValid);
        gbDepthWeighted += gbWeight * vec4f(splatDepth);
        gbWeightSum += gbWeight;
        gbMatWeighted[0] += splatMat * gbWeight.x;
        gbMatWeighted[1] += splatMat * gbWeight.y;
        gbMatWeighted[2] += splatMat * gbWeight.z;
        gbMatWeighted[3] += splatMat * gbWeight.w;
        gbNrmWeighted0 += splatNrm * gbWeight.x;
        gbNrmWeighted1 += splatNrm * gbWeight.y;
        gbNrmWeighted2 += splatNrm * gbWeight.z;
        gbNrmWeighted3 += splatNrm * gbWeight.w;
        gbNormalConfidenceWeighted += shNormalConfidence[i] * gbWeight;

        let splatEm = shEmissive[i];
        em00 += splatEm * weight.x;
        em10 += splatEm * weight.y;
        em01 += splatEm * weight.z;
        em11 += splatEm * weight.w;

        if (all(T < vec4f(TRANSMITTANCE_CUTOFF))) {
          threadDone = true;
          break;
        }
      }
    }

    workgroupBarrier();
  }

  // Finalize G-buffer: normalize weighted votes
  let safeWeight = max(gbWeightSum, vec4f(0.0001));
  let gbDepth = gbDepthWeighted / safeWeight;
  let gbMat00 = gbMatWeighted[0] / safeWeight.x;
  let gbMat10 = gbMatWeighted[1] / safeWeight.y;
  let gbMat01 = gbMatWeighted[2] / safeWeight.z;
  let gbMat11 = gbMatWeighted[3] / safeWeight.w;
  let gbNormalConfidence = gbNormalConfidenceWeighted / safeWeight;
  // Normalize voted normals (re-normalize the weighted average)
  let gbNrm00 = octEncode(normalize(gbNrmWeighted0 + vec3f(0.0, 0.0001, 0.0)));
  let gbNrm10 = octEncode(normalize(gbNrmWeighted1 + vec3f(0.0, 0.0001, 0.0)));
  let gbNrm01 = octEncode(normalize(gbNrmWeighted2 + vec3f(0.0, 0.0001, 0.0)));
  let gbNrm11 = octEncode(normalize(gbNrmWeighted3 + vec3f(0.0, 0.0001, 0.0)));

  // Write results for the 2x2 pixel quad
  let bgColor = vec3f(0.02, 0.02, 0.04);
  let outputSize = textureDimensions(outputColor);

  if (basePixel.x < outputSize.x && basePixel.y < outputSize.y) {
    let px = vec2i(basePixel);
    textureStore(outputColor, px, vec4f(c00 + T.x * bgColor, 1.0 - T.x));
    textureStore(outputDepth, px, vec4f(gbDepth.x, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm00), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat00), pack2x16float(em00.rg), pack2x16float(vec2f(em00.b, 0.0)), pack2x16float(vec2f(gbNormalConfidence.x, 0.0))));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y < outputSize.y) {
    let px = vec2i(vec2u(basePixel.x + 1u, basePixel.y));
    textureStore(outputColor, px, vec4f(c10 + T.y * bgColor, 1.0 - T.y));
    textureStore(outputDepth, px, vec4f(gbDepth.y, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm10), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat10), pack2x16float(em10.rg), pack2x16float(vec2f(em10.b, 0.0)), pack2x16float(vec2f(gbNormalConfidence.y, 0.0))));
  }
  if (basePixel.x < outputSize.x && basePixel.y + 1u < outputSize.y) {
    let px = vec2i(vec2u(basePixel.x, basePixel.y + 1u));
    textureStore(outputColor, px, vec4f(c01 + T.z * bgColor, 1.0 - T.z));
    textureStore(outputDepth, px, vec4f(gbDepth.z, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm01), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat01), pack2x16float(em01.rg), pack2x16float(vec2f(em01.b, 0.0)), pack2x16float(vec2f(gbNormalConfidence.z, 0.0))));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y + 1u < outputSize.y) {
    let px = vec2i(vec2u(basePixel.x + 1u, basePixel.y + 1u));
    textureStore(outputColor, px, vec4f(c11 + T.w * bgColor, 1.0 - T.w));
    textureStore(outputDepth, px, vec4f(gbDepth.w, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm11), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat11), pack2x16float(em11.rg), pack2x16float(vec2f(em11.b, 0.0)), pack2x16float(vec2f(gbNormalConfidence.w, 0.0))));
  }
}
