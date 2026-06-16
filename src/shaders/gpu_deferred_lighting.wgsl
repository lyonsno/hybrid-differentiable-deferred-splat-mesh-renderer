// Deferred lighting pass: simplified Disney BRDF (GGX specular + Lambertian diffuse).
// Reads G-buffer color, depth, screen-space normals. Writes lit result.
//
// Dispatch: ceil(width/8) x ceil(height/8)

struct Params {
  viewport: vec2f,
  roughness: f32,
  metallic: f32,
  viewProjInv: mat4x4f,
  cameraPos: vec3f,
  _pad0: f32,
  lightDir: vec3f,
  _pad1: f32,
  lightColor: vec3f,
  lightIntensity: f32,
  ambientColor: vec3f,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var colorTexture: texture_2d<f32>;
@group(0) @binding(2) var depthTexture: texture_2d<f32>;
@group(0) @binding(3) var normalTexture: texture_2d<u32>;
@group(0) @binding(4) var outputLit: texture_storage_2d<rgba16float, write>;

const PI = 3.14159265359;

fn octDecode(oct: vec2f) -> vec3f {
  var n = vec3f(oct.x, oct.y, 1.0 - abs(oct.x) - abs(oct.y));
  if (n.z < 0.0) {
    n = vec3f((1.0 - abs(n.yx)) * select(vec2f(-1.0), vec2f(1.0), n.xy >= vec2f(0.0)), n.z);
  }
  return normalize(n);
}

fn reconstructWorldPos(pixelCoord: vec2f, depth: f32) -> vec3f {
  let ndc = vec2f(
    pixelCoord.x / params.viewport.x * 2.0 - 1.0,
    1.0 - pixelCoord.y / params.viewport.y * 2.0,
  );
  let clip = vec4f(ndc, depth, 1.0);
  let world = params.viewProjInv * clip;
  return world.xyz / world.w;
}

// GGX/Trowbridge-Reitz normal distribution
fn distributionGGX(NdotH: f32, roughness: f32) -> f32 {
  let a = roughness * roughness;
  let a2 = a * a;
  let d = NdotH * NdotH * (a2 - 1.0) + 1.0;
  return a2 / (PI * d * d);
}

// Schlick-GGX geometry function
fn geometrySchlickGGX(NdotV: f32, roughness: f32) -> f32 {
  let r = roughness + 1.0;
  let k = (r * r) / 8.0;
  return NdotV / (NdotV * (1.0 - k) + k);
}

fn geometrySmith(NdotV: f32, NdotL: f32, roughness: f32) -> f32 {
  return geometrySchlickGGX(NdotV, roughness) * geometrySchlickGGX(NdotL, roughness);
}

// Schlick Fresnel approximation
fn fresnelSchlick(cosTheta: f32, F0: vec3f) -> vec3f {
  return F0 + (1.0 - F0) * pow(saturate(1.0 - cosTheta), 5.0);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = vec2i(gid.xy);
  let size = vec2i(textureDimensions(colorTexture));
  if (px.x >= size.x || px.y >= size.y) { return; }

  let albedo = textureLoad(colorTexture, px, 0).rgb;
  let depth = textureLoad(depthTexture, px, 0).r;

  // Background: pass through
  if (depth >= 0.9999) {
    textureStore(outputLit, px, vec4f(albedo, 1.0));
    return;
  }

  let packedNormal = textureLoad(normalTexture, px, 0).r;
  let N = octDecode(unpack2x16float(packedNormal));

  let center = vec2f(f32(px.x) + 0.5, f32(px.y) + 0.5);
  let worldPos = reconstructWorldPos(center, depth);
  let V = normalize(params.cameraPos - worldPos);
  let L = normalize(-params.lightDir);
  let H = normalize(V + L);

  let NdotL = max(dot(N, L), 0.0);
  let NdotV = max(dot(N, V), 0.001);
  let NdotH = max(dot(N, H), 0.0);
  let HdotV = max(dot(H, V), 0.0);

  // Material properties
  let roughness = params.roughness;
  let metallic = params.metallic;
  let F0 = mix(vec3f(0.04), albedo, metallic);

  // Cook-Torrance BRDF
  let D = distributionGGX(NdotH, roughness);
  let G = geometrySmith(NdotV, NdotL, roughness);
  let F = fresnelSchlick(HdotV, F0);

  let numerator = D * G * F;
  let denominator = 4.0 * NdotV * NdotL + 0.0001;
  let specular = numerator / denominator;

  let kS = F;
  let kD = (vec3f(1.0) - kS) * (1.0 - metallic);

  let Lo = (kD * albedo / PI + specular) * params.lightColor * params.lightIntensity * NdotL;
  let ambient = params.ambientColor * albedo;
  let color = ambient + Lo;

  // Simple Reinhard tonemap
  let mapped = color / (color + vec3f(1.0));

  textureStore(outputLit, px, vec4f(mapped, 1.0));
}
