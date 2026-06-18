enable f16;

// Half-precision variant of the shared-memory batched rasterizer.
// Color accumulation and transmittance use f16 (halves shared memory for color,
// doubles ALU throughput on accumulation). Gaussian evaluation stays f32 for
// numerical precision on covariance/exponent math.

struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  totalTileRefs: u32,
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

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> projCache: array<u32>;
@group(0) @binding(2) var<storage, read> colors: array<f32>;
@group(0) @binding(3) var<storage, read> sortedIndices: array<u32>;

const PROJ_STRIDE = 9u;

@group(1) @binding(0) var<storage, read_write> tileCounts: array<atomic<u32>>;
@group(1) @binding(1) var<storage, read_write> tileOffsets: array<u32>;
@group(1) @binding(2) var<storage, read_write> tileEntries: array<u32>;
@group(1) @binding(3) var outputColor: texture_storage_2d<rgba16float, write>;
@group(1) @binding(4) var<storage, read> depthBuffer: array<u32>;
@group(1) @binding(5) var outputDepth: texture_storage_2d<r32float, write>;
@group(1) @binding(6) var outputNormal: texture_storage_2d<r32uint, write>;
@group(1) @binding(7) var outputMaterial: texture_storage_2d<r32uint, write>;
@group(1) @binding(8) var<storage, read_write> counters: array<atomic<u32>>;

const BATCH_SIZE = 64u;
const ALPHA_THRESHOLD: f16 = 1.0h / 255.0h;
const TRANSMITTANCE_CUTOFF: f16 = 0.001h;
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

// Shared memory: centers and coefficients stay f32, color goes f16
var<workgroup> shCenter: array<vec2f, 64>;
var<workgroup> shCoeffs: array<vec3f, 64>;  // (covXX*-0.5, covYY*-0.5, -covXY)
var<workgroup> shColor: array<vec4<f16>, 64>;   // (r, g, b, opacity) — half precision
var<workgroup> shMaterial: array<vec2f, 64>; // (roughness, metalness) per splat
var<workgroup> shNormal: array<vec3f, 64>;   // decoded unit normal per splat
var<workgroup> shDepth: array<f32, 64>;       // depthNdc per splat
var<workgroup> shTileRefCount: atomic<u32>;

@compute @workgroup_size(8, 8, 1)
fn composite(
  @builtin(local_invocation_id) lid: vec3u,
  @builtin(local_invocation_index) localIdx: u32,
  @builtin(workgroup_id) wid: vec3u,
  @builtin(num_workgroups) numWorkgroups: vec3u,
) {
  let workgroupIdx = wid.y * numWorkgroups.x + wid.x;
  let tileX = workgroupIdx % frame.tileGrid.x;
  let tileY = workgroupIdx / frame.tileGrid.x;
  if (tileY >= frame.tileGrid.y) { return; }
  let tileId = mortonEncode2D(tileX, tileY);

  let basePixel = vec2u(tileX * TILE_PX + lid.x * 2u, tileY * TILE_PX + lid.y * 2u);
  let p00 = vec2f(f32(basePixel.x) + 0.5, f32(basePixel.y) + 0.5);

  // Per-pixel transmittance and accumulated color — f16
  var T = vec4<f16>(1.0h);
  var c00 = vec3<f16>(0.0h);
  var c10 = vec3<f16>(0.0h);
  var c01 = vec3<f16>(0.0h);
  var c11 = vec3<f16>(0.0h);

  // G-buffer: alpha-weighted voting for depth, normal, and material (2x2 quad)
  var gbDepthWeighted = vec4f(0.0);
  var gbWeightSum = vec4f(0.0);
  var gbMatWeighted = mat4x2f();
  var gbNrmWeighted0 = vec3f(0.0);
  var gbNrmWeighted1 = vec3f(0.0);
  var gbNrmWeighted2 = vec3f(0.0);
  var gbNrmWeighted3 = vec3f(0.0);

  let refStart = tileOffsets[tileId];
  if (localIdx == 0u) {
    atomicStore(&shTileRefCount, atomicLoad(&tileCounts[tileId]));
  }
  let refCount = workgroupUniformLoad(&shTileRefCount);
  let numBatches = (refCount + BATCH_SIZE - 1u) / BATCH_SIZE;
  var threadDone = false;

  for (var batchIdx: u32 = 0u; batchIdx < numBatches; batchIdx++) {
    let entryOffset = batchIdx * BATCH_SIZE + localIdx;
    if (entryOffset < refCount) {
      let sortRank = tileEntries[refStart + entryOffset];
      let cacheBase = sortRank * PROJ_STRIDE;

      shCenter[localIdx] = vec2f(
        bitcast<f32>(projCache[cacheBase + 0u]),
        bitcast<f32>(projCache[cacheBase + 1u]),
      );
      let covX = bitcast<f32>(projCache[cacheBase + 2u]);
      let covY = bitcast<f32>(projCache[cacheBase + 3u]);
      let covZ = bitcast<f32>(projCache[cacheBase + 4u]);
      shCoeffs[localIdx] = vec3f(covX * -0.5, covZ * -0.5, -covY);

      let radiusOpacity = unpack2x16float(projCache[cacheBase + 6u]);
      let opacity = radiusOpacity.y;

      let splatId = sortedIndices[sortRank];
      let colorBase = splatId * 3u;
      shColor[localIdx] = vec4<f16>(
        f16(colors[colorBase]), f16(colors[colorBase + 1u]), f16(colors[colorBase + 2u]),
        f16(opacity),
      );
      shMaterial[localIdx] = unpack2x16float(projCache[cacheBase + 5u]); // (roughness, metalness)
      shNormal[localIdx] = octDecode(unpack2x16float(projCache[cacheBase + 8u])); // per-splat normal
      shDepth[localIdx] = bitcast<f32>(depthBuffer[sortRank]);
    } else {
      shColor[localIdx] = vec4<f16>(0.0h);
      shMaterial[localIdx] = vec2f(0.75, 0.0);
      shNormal[localIdx] = vec3f(0.0, 1.0, 0.0);
      shDepth[localIdx] = 1.0;
    }

    workgroupBarrier();

    if (!threadDone) {
      let batchCount = min(BATCH_SIZE, refCount - batchIdx * BATCH_SIZE);

      for (var i: u32 = 0u; i < batchCount; i++) {
        let center = shCenter[i];
        let coeffs = shCoeffs[i];
        let splatColor = shColor[i];

        // Gaussian evaluation stays f32 for precision
        let d = p00 - center;
        let dxV = vec4f(d.x, d.x + 1.0, d.x, d.x + 1.0);
        let dyV = vec4f(d.y, d.y, d.y + 1.0, d.y + 1.0);
        let power4 = coeffs.x * dxV * dxV + coeffs.z * dxV * dyV + coeffs.y * dyV * dyV;

        if (all(power4 <= vec4f(-4.0))) {
          continue;
        }

        // Gaussian + alpha in f32, then convert to f16 for accumulation
        let gauss4 = exp(power4);
        let alpha4_f32 = min(vec4f(0.99), vec4f(f32(splatColor.a)) * gauss4);
        let alpha4 = vec4<f16>(alpha4_f32);
        let newT = T * (vec4<f16>(1.0h) - alpha4);

        let valid = (power4 > vec4f(-4.0)) & (alpha4_f32 > vec4f(f32(ALPHA_THRESHOLD))) & (vec4f(T) >= vec4f(f32(TRANSMITTANCE_CUTOFF)));
        let weight = alpha4 * T * select(vec4<f16>(0.0h), vec4<f16>(1.0h), valid);

        c00 += splatColor.rgb * weight.x;
        c10 += splatColor.rgb * weight.y;
        c01 += splatColor.rgb * weight.z;
        c11 += splatColor.rgb * weight.w;
        T = select(T, newT, valid);

        // G-buffer: alpha-weighted voting for depth, normal, and material.
        let w32 = vec4f(weight);
        let splatDepth = shDepth[i];
        let splatMat = shMaterial[i];
        let splatNrm = shNormal[i];
        let gbValid = w32 > vec4f(0.01);
        let gbWeight = select(vec4f(0.0), w32, gbValid);
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

        if (all(T < vec4<f16>(TRANSMITTANCE_CUTOFF))) {
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
  let gbNrm00 = octEncode(normalize(gbNrmWeighted0 + vec3f(0.0, 0.0001, 0.0)));
  let gbNrm10 = octEncode(normalize(gbNrmWeighted1 + vec3f(0.0, 0.0001, 0.0)));
  let gbNrm01 = octEncode(normalize(gbNrmWeighted2 + vec3f(0.0, 0.0001, 0.0)));
  let gbNrm11 = octEncode(normalize(gbNrmWeighted3 + vec3f(0.0, 0.0001, 0.0)));

  // Write results — promote to f32 for textureStore
  // debugMode bit 0: transparent background (for overlay compositing)
  let transparentBg = (bitcast<u32>(frame.debugMode) & 1u) != 0u;
  let bgColor = select(vec3<f16>(0.02h, 0.02h, 0.04h), vec3<f16>(0.0h), transparentBg);
  let outputSize = textureDimensions(outputColor);

  if (basePixel.x < outputSize.x && basePixel.y < outputSize.y) {
    let px = vec2i(basePixel);
    textureStore(outputColor, px, vec4f(vec3f(c00 + T.x * bgColor), 1.0 - f32(T.x)));
    textureStore(outputDepth, px, vec4f(gbDepth.x, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm00), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat00), 0u, 0u, 0u));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y < outputSize.y) {
    let px = vec2i(vec2u(basePixel.x + 1u, basePixel.y));
    textureStore(outputColor, px, vec4f(vec3f(c10 + T.y * bgColor), 1.0 - f32(T.y)));
    textureStore(outputDepth, px, vec4f(gbDepth.y, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm10), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat10), 0u, 0u, 0u));
  }
  if (basePixel.x < outputSize.x && basePixel.y + 1u < outputSize.y) {
    let px = vec2i(vec2u(basePixel.x, basePixel.y + 1u));
    textureStore(outputColor, px, vec4f(vec3f(c01 + T.z * bgColor), 1.0 - f32(T.z)));
    textureStore(outputDepth, px, vec4f(gbDepth.z, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm01), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat01), 0u, 0u, 0u));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y + 1u < outputSize.y) {
    let px = vec2i(vec2u(basePixel.x + 1u, basePixel.y + 1u));
    textureStore(outputColor, px, vec4f(vec3f(c11 + T.w * bgColor), 1.0 - f32(T.w)));
    textureStore(outputDepth, px, vec4f(gbDepth.w, 0.0, 0.0, 0.0));
    textureStore(outputNormal, px, vec4u(pack2x16float(gbNrm11), 0u, 0u, 0u));
    textureStore(outputMaterial, px, vec4u(pack2x16float(gbMat11), 0u, 0u, 0u));
  }
}
