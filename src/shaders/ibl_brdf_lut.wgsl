// Generate BRDF integration LUT for split-sum IBL approximation.
// 2D texture indexed by (NdotV, roughness) → (scale, bias) for Fresnel.
// Based on the Epic Games / Karis split-sum approximation.
// Dispatch: ceil(size/8) x ceil(size/8), typically 256x256.

struct Params {
  size: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var outputLUT: texture_storage_2d<rgba16float, write>;
@group(0) @binding(1) var<uniform> params: Params;

const PI = 3.14159265359;
const SAMPLE_COUNT = 1024u;

fn radicalInverseVdC(bitsIn: u32) -> f32 {
  var bits = bitsIn;
  bits = (bits << 16u) | (bits >> 16u);
  bits = ((bits & 0x55555555u) << 1u) | ((bits & 0xAAAAAAAAu) >> 1u);
  bits = ((bits & 0x33333333u) << 2u) | ((bits & 0xCCCCCCCCu) >> 2u);
  bits = ((bits & 0x0F0F0F0Fu) << 4u) | ((bits & 0xF0F0F0F0u) >> 4u);
  bits = ((bits & 0x00FF00FFu) << 8u) | ((bits & 0xFF00FF00u) >> 8u);
  return f32(bits) * 2.3283064365386963e-10; // 0x100000000
}

fn hammersley(i: u32, N: u32) -> vec2f {
  return vec2f(f32(i) / f32(N), radicalInverseVdC(i));
}

fn importanceSampleGGX(Xi: vec2f, N: vec3f, roughness: f32) -> vec3f {
  let a = roughness * roughness;
  let phi = 2.0 * PI * Xi.x;
  let cosTheta = sqrt((1.0 - Xi.y) / (1.0 + (a * a - 1.0) * Xi.y));
  let sinTheta = sqrt(1.0 - cosTheta * cosTheta);

  let H = vec3f(cos(phi) * sinTheta, sin(phi) * sinTheta, cosTheta);

  let up = select(vec3f(1.0, 0.0, 0.0), vec3f(0.0, 0.0, 1.0), abs(N.z) < 0.999);
  let tangent = normalize(cross(up, N));
  let bitangent = cross(N, tangent);

  return normalize(tangent * H.x + bitangent * H.y + N * H.z);
}

fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
  let a = roughness;
  let k = (a * a) / 2.0; // IBL uses k = a²/2, not (a+1)²/8
  return NdotV / (NdotV * (1.0 - k) + k);
}

fn geometrySmith(N: vec3f, V: vec3f, L: vec3f, roughness: f32) -> f32 {
  let NdotV = max(dot(N, V), 0.0);
  let NdotL = max(dot(N, L), 0.0);
  return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let coord = vec2i(gid.xy);
  let size = i32(params.size);
  if (coord.x >= size || coord.y >= size) { return; }

  let NdotV = max(f32(coord.x) / f32(size - 1), 0.001);
  let roughness = max(f32(coord.y) / f32(size - 1), 0.001);

  let V = vec3f(sqrt(1.0 - NdotV * NdotV), 0.0, NdotV);
  let N = vec3f(0.0, 0.0, 1.0);

  var A: f32 = 0.0; // scale
  var B: f32 = 0.0; // bias

  for (var i = 0u; i < SAMPLE_COUNT; i++) {
    let Xi = hammersley(i, SAMPLE_COUNT);
    let H = importanceSampleGGX(Xi, N, roughness);
    let L = normalize(2.0 * dot(V, H) * H - V);

    let NdotL = max(L.z, 0.0);
    let NdotH = max(H.z, 0.0);
    let VdotH = max(dot(V, H), 0.0);

    if (NdotL > 0.0) {
      let G = geometrySmith(N, V, L, roughness);
      let G_Vis = (G * VdotH) / (NdotH * NdotV);
      let Fc = pow(1.0 - VdotH, 5.0);

      A += (1.0 - Fc) * G_Vis;
      B += Fc * G_Vis;
    }
  }

  A /= f32(SAMPLE_COUNT);
  B /= f32(SAMPLE_COUNT);

  textureStore(outputLUT, coord, vec4f(A, B, 0.0, 0.0));
}
