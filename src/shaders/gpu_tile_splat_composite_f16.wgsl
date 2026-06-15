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

const PROJ_STRIDE = 8u;

@group(1) @binding(0) var<storage, read_write> tileCounts: array<atomic<u32>>;
@group(1) @binding(1) var<storage, read_write> tileOffsets: array<u32>;
@group(1) @binding(2) var<storage, read_write> tileEntries: array<u32>;
@group(1) @binding(3) var outputColor: texture_storage_2d<rgba16float, write>;
@group(1) @binding(4) var<storage, read> depthBuffer: array<u32>;

const BATCH_SIZE = 64u;
const ALPHA_THRESHOLD: f16 = 1.0h / 255.0h;
const TRANSMITTANCE_CUTOFF: f16 = 0.001h;
const TILE_PX = 16u;

// Shared memory: centers and coefficients stay f32, color goes f16
var<workgroup> shCenter: array<vec2f, 64>;
var<workgroup> shCoeffs: array<vec3f, 64>;  // (covXX*-0.5, covYY*-0.5, -covXY)
var<workgroup> shColor: array<vec4<f16>, 64>;   // (r, g, b, opacity) — half precision
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
    } else {
      shColor[localIdx] = vec4<f16>(0.0h);
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

        if (all(T < vec4<f16>(TRANSMITTANCE_CUTOFF))) {
          threadDone = true;
          break;
        }
      }
    }

    workgroupBarrier();
  }

  // Write results — promote to f32 for textureStore
  let bgColor = vec3<f16>(0.02h, 0.02h, 0.04h);
  let outputSize = textureDimensions(outputColor);

  if (basePixel.x < outputSize.x && basePixel.y < outputSize.y) {
    textureStore(outputColor, vec2i(basePixel), vec4f(vec3f(c00 + T.x * bgColor), 1.0));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y < outputSize.y) {
    textureStore(outputColor, vec2i(vec2u(basePixel.x + 1u, basePixel.y)), vec4f(vec3f(c10 + T.y * bgColor), 1.0));
  }
  if (basePixel.x < outputSize.x && basePixel.y + 1u < outputSize.y) {
    textureStore(outputColor, vec2i(vec2u(basePixel.x, basePixel.y + 1u)), vec4f(vec3f(c01 + T.z * bgColor), 1.0));
  }
  if (basePixel.x + 1u < outputSize.x && basePixel.y + 1u < outputSize.y) {
    textureStore(outputColor, vec2i(vec2u(basePixel.x + 1u, basePixel.y + 1u)), vec4f(vec3f(c11 + T.w * bgColor), 1.0));
  }
}
