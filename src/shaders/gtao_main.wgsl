// GTAO main pass: 3 slices × 6 samples, Hilbert R2 sampling.
// Adapted from XeGTAO / Kaminos ao-compute.js (MIT license).
//
// Based on Jimenez et al. 2016 "Practical Realtime Strategies for Accurate
// Indirect Occlusion" and Intel's XeGTAO implementation.

struct Params {
  projInfo: vec4f,       // x: 2/projMat[0][0], y: 2/projMat[1][1], z: -1/projMat[0][0], w: -1/projMat[1][1]
  resolution: vec2f,
  radiusWorld: f32,
  falloffEnd: f32,
  sliceCount: u32,       // 3
  stepsPerSlice: u32,    // 3 per side = 6 total
  frameCounter: u32,
  intensity: f32,
  thickness: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
  viewMatrix: mat4x4f,   // world → view transform for G-buffer normals
};

@group(0) @binding(0) var depthMip0: texture_2d<f32>;
@group(0) @binding(1) var depthMip1: texture_2d<f32>;
@group(0) @binding(2) var depthMip2: texture_2d<f32>;
@group(0) @binding(3) var normalTexture: texture_2d<u32>; // G-buffer oct-encoded normals (world space)
@group(0) @binding(4) var outputAO: texture_storage_2d<r32float, write>;
@group(0) @binding(5) var<uniform> params: Params;

const PI: f32 = 3.14159265;

fn r2Sequence(idx: u32) -> vec2f {
  let a1 = 1.0 / 1.3247179572;
  let a2 = a1 * a1;
  return fract(vec2f(f32(idx) * a1, f32(idx) * a2) + 0.5);
}

fn hilbertIndex(x: u32, y: u32) -> u32 {
  var rx: u32; var ry: u32; var s: u32; var d: u32 = 0u;
  var px = x; var py = y;
  s = 8u;
  loop {
    if (s == 0u) { break; }
    s = s >> 1u;
    rx = select(0u, 1u, (px & s) > 0u);
    ry = select(0u, 1u, (py & s) > 0u);
    d += s * s * ((3u * rx) ^ ry);
    if (ry == 0u) {
      if (rx == 1u) {
        px = s * 2u - 1u - px;
        py = s * 2u - 1u - py;
      }
      let tmp = px;
      px = py;
      py = tmp;
    }
  }
  return d;
}

fn octDecode(e: vec2f) -> vec3f {
  var n = vec3f(e.xy, 1.0 - abs(e.x) - abs(e.y));
  if (n.z < 0.0) {
    n = vec3f((1.0 - abs(n.yx)) * select(vec2f(-1.0), vec2f(1.0), n.xy >= vec2f(0.0)), n.z);
  }
  return normalize(n);
}

fn viewPosFromDepth(uv: vec2f, depth: f32) -> vec3f {
  return vec3f(
    (uv.x * params.projInfo.x + params.projInfo.z) * depth,
    (uv.y * params.projInfo.y + params.projInfo.w) * depth,
    -depth
  );
}

fn sampleDepthMIP(uv: vec2f, mipLevel: i32) -> f32 {
  switch(mipLevel) {
    case 0: {
      let dim = vec2f(textureDimensions(depthMip0));
      let coord = clamp(vec2i(uv * dim), vec2i(0), vec2i(dim) - vec2i(1));
      return textureLoad(depthMip0, coord, 0).r;
    }
    case 1: {
      let dim = vec2f(textureDimensions(depthMip1));
      let coord = clamp(vec2i(uv * dim), vec2i(0), vec2i(dim) - vec2i(1));
      return textureLoad(depthMip1, coord, 0).r;
    }
    default: {
      let dim = vec2f(textureDimensions(depthMip2));
      let coord = clamp(vec2i(uv * dim), vec2i(0), vec2i(dim) - vec2i(1));
      return textureLoad(depthMip2, coord, 0).r;
    }
  }
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let coord = vec2i(gid.xy);
  let res = vec2i(params.resolution);
  if (coord.x >= res.x || coord.y >= res.y) { return; }

  let uv = (vec2f(coord) + 0.5) / params.resolution;
  let centerDepth = textureLoad(depthMip0, coord, 0).r;

  if (centerDepth <= 0.0 || centerDepth > params.falloffEnd * 10.0) {
    textureStore(outputAO, coord, vec4f(1.0, 0.0, 0.0, 0.0));
    return;
  }

  let viewPos = viewPosFromDepth(uv, centerDepth);

  // Read baked normal from G-buffer (world space, oct-encoded) and transform to view space
  let packedNormal = textureLoad(normalTexture, coord, 0).r;
  let worldNormal = octDecode(unpack2x16float(packedNormal));
  let viewNormal = normalize((params.viewMatrix * vec4f(worldNormal, 0.0)).xyz);

  // Convert world-space radius to pixel radius: radius * focalLengthPx / depth
  // focalLengthPx = proj[0][0] * viewport.x * 0.5 = viewport.x / projInfo.x
  let focalPx = params.resolution.x / abs(params.projInfo.x);
  let screenRadius = params.radiusWorld * focalPx / centerDepth;
  let pixelRadius = max(screenRadius, 1.0);

  let hilbert = hilbertIndex(u32(coord.x) & 15u, u32(coord.y) & 15u);
  let spatialOffset = r2Sequence(hilbert + params.frameCounter * 256u);

  var totalAO: f32 = 0.0;
  let sliceCount = params.sliceCount;
  let stepsPerSide = params.stepsPerSlice;

  for (var slice = 0u; slice < sliceCount; slice = slice + 1u) {
    let phi = (PI / f32(sliceCount)) * (f32(slice) + spatialOffset.x);
    let dir = vec2f(cos(phi), sin(phi));

    var maxHorizonPos: f32 = -1.0;
    var maxHorizonNeg: f32 = -1.0;

    for (var step = 1u; step <= stepsPerSide; step = step + 1u) {
      let t = (f32(step) + spatialOffset.y * 0.5) / f32(stepsPerSide);
      let offset = dir * pixelRadius * t / params.resolution;
      let mipLevel = i32(clamp(log2(pixelRadius * t / 4.0), 0.0, 2.0));

      let sampleUVPos = uv + offset;
      if (sampleUVPos.x >= 0.0 && sampleUVPos.x <= 1.0 && sampleUVPos.y >= 0.0 && sampleUVPos.y <= 1.0) {
        let sampleDepth = sampleDepthMIP(sampleUVPos, mipLevel);
        let samplePos = viewPosFromDepth(sampleUVPos, sampleDepth);
        let diff = samplePos - viewPos;
        let dist = length(diff);
        if (dist > 0.001) {
          // Thickness test: smooth falloff based on depth difference ratio
          let zRatio = abs(diff.z) / params.thickness;
          let thickWeight = saturate(1.0 - zRatio * zRatio);
          let horizon = dot(diff, viewNormal) / dist;
          let falloff = saturate(1.0 - dist / params.falloffEnd);
          maxHorizonPos = max(maxHorizonPos, horizon * falloff * thickWeight);
        }
      }

      let sampleUVNeg = uv - offset;
      if (sampleUVNeg.x >= 0.0 && sampleUVNeg.x <= 1.0 && sampleUVNeg.y >= 0.0 && sampleUVNeg.y <= 1.0) {
        let sampleDepth = sampleDepthMIP(sampleUVNeg, mipLevel);
        let samplePos = viewPosFromDepth(sampleUVNeg, sampleDepth);
        let diff = samplePos - viewPos;
        let dist = length(diff);
        if (dist > 0.001) {
          let zRatio = abs(diff.z) / params.thickness;
          let thickWeight = saturate(1.0 - zRatio * zRatio);
          let horizon = dot(diff, viewNormal) / dist;
          let falloff = saturate(1.0 - dist / params.falloffEnd);
          maxHorizonNeg = max(maxHorizonNeg, horizon * falloff * thickWeight);
        }
      }
    }

    let nDotSlice = dot(viewNormal, vec3f(dir, 0.0));
    let cosHPos = max(maxHorizonPos, nDotSlice * 0.08);
    let cosHNeg = max(maxHorizonNeg, nDotSlice * 0.08);
    totalAO += cosHPos + cosHNeg;
  }

  totalAO /= f32(sliceCount) * 2.0;
  let ao = saturate(1.0 - totalAO * params.intensity);
  textureStore(outputAO, coord, vec4f(ao, 0.0, 0.0, 0.0));
}
