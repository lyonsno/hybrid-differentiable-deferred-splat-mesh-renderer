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
  specularOnly: f32,
  emissiveIntensity: f32,
  emissiveThreshold: f32,
  envIntensity: f32,
  envRotation: f32,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var colorTexture: texture_2d<f32>;
@group(0) @binding(2) var depthTexture: texture_2d<f32>;
@group(0) @binding(3) var normalTexture: texture_2d<u32>;
@group(0) @binding(4) var materialTexture: texture_2d<u32>; // rgba32uint: .r=pack2x16float(roughness,metalness), .g=pack2x16float(emissive_rg), .b=pack2x16float(emissive_b,0)
@group(0) @binding(5) var outputLit: texture_storage_2d<rgba16float, write>;
@group(0) @binding(6) var aoTexture: texture_2d<f32>; // GTAO result (0=occluded, 1=visible)
@group(0) @binding(7) var envMap: texture_2d<f32>;  // equirect HDR environment
@group(0) @binding(8) var brdfLUT: texture_2d<f32>; // split-sum BRDF integration LUT
@group(0) @binding(9) var envSampler: sampler;
@group(0) @binding(10) var bloomTex: texture_2d<f32>; // half-res bloom for AO erasure
@group(0) @binding(11) var roughnessLUT: texture_1d<f32>; // 256-entry curve remap
@group(0) @binding(12) var metalnessLUT: texture_1d<f32>;
@group(0) @binding(13) var albedoLUT: texture_1d<f32>;

const PI = 3.14159265359;

// sRGB ↔ linear conversions
fn srgbToLinear(c: vec3f) -> vec3f {
  // Approximate: pow(c, 2.2). Exact piecewise would check < 0.04045 but
  // the difference is negligible for our use case.
  return pow(max(c, vec3f(0.0)), vec3f(2.2));
}

fn linearToSrgb(c: vec3f) -> vec3f {
  return pow(max(c, vec3f(0.0)), vec3f(1.0 / 2.2));
}

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

// Schlick-GGX geometry function — direct lighting k factor: (roughness+1)²/8.
// The IBL path uses a different k (a²/2) baked into the BRDF LUT (ibl_brdf_lut.wgsl).
// This function is only called for the direct Cook-Torrance specular.
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

fn fresnelSchlickRoughness(cosTheta: f32, F0: vec3f, roughness: f32) -> vec3f {
  return F0 + (max(vec3f(1.0 - roughness), F0) - F0) * pow(saturate(1.0 - cosTheta), 5.0);
}

// Rotate direction around Y axis by angle (radians)
fn rotateY(dir: vec3f, angle: f32) -> vec3f {
  let c = cos(angle);
  let s = sin(angle);
  return vec3f(c * dir.x + s * dir.z, dir.y, -s * dir.x + c * dir.z);
}

// Sample equirectangular environment map with rotation and intensity
fn sampleEnvEquirectLod(dir: vec3f, lod: f32) -> vec3f {
  let rotDir = rotateY(dir, params.envRotation);
  let u = atan2(rotDir.z, rotDir.x) / (2.0 * PI) + 0.5;
  let v = asin(clamp(rotDir.y, -1.0, 1.0)) / PI + 0.5;
  return textureSampleLevel(envMap, envSampler, vec2f(u, v), lod).rgb * params.envIntensity;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = vec2i(gid.xy);
  let size = vec2i(textureDimensions(colorTexture));
  if (px.x >= size.x || px.y >= size.y) { return; }

  let colorSample = textureLoad(colorTexture, px, 0);
  let albedoSrgb = colorSample.rgb;
  let splatOpacity = colorSample.a; // opacity from compositor (1-T)
  let depth = textureLoad(depthTexture, px, 0).r;

  // Background: pass through with zero opacity
  if (depth >= 0.9999) {
    textureStore(outputLit, px, vec4f(albedoSrgb, 0.0));
    return;
  }

  // Remap albedo through curve LUT, then linearize
  let albedoLum = dot(albedoSrgb, vec3f(0.2126, 0.7152, 0.0722));
  let albedoRemapped = textureLoad(albedoLUT, clamp(i32(albedoLum * 255.0), 0, 255), 0).r;
  let albedoScale = select(albedoRemapped / max(albedoLum, 0.001), 1.0, albedoLum < 0.001);
  let albedo = srgbToLinear(albedoSrgb * albedoScale);

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

  // Material properties from G-buffer (per-pixel voted roughness/metalness + emissive)
  let matSample = textureLoad(materialTexture, px, 0);
  let matVec = unpack2x16float(matSample.r);
  let roughness = max(textureLoad(roughnessLUT, clamp(i32(matVec.x * 255.0), 0, 255), 0).r, 0.04);
  let metallic = textureLoad(metalnessLUT, clamp(i32(matVec.y * 255.0), 0, 255), 0).r;
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

  // Ambient occlusion + bent normal from GTAO
  let aoSample = textureLoad(aoTexture, px, 0);
  let aoRaw = aoSample.r;

  // Emissive: read early so we can use it to carve into AO
  let emRG = unpack2x16float(matSample.g);
  let emB = unpack2x16float(matSample.b).x;
  let emissiveRaw = vec3f(emRG.x, emRG.y, emB);
  let emissiveMag = max(emissiveRaw.r, max(emissiveRaw.g, emissiveRaw.b));

  // Bloom-based AO erasure: the spatial bloom spread clears occlusion around emissive regions
  let bloomUV = (vec2f(px) + 0.5) / params.viewport;
  let bloomSample = textureSampleLevel(bloomTex, envSampler, bloomUV, 0.0).rgb;
  let bloomMag = dot(bloomSample, vec3f(0.2126, 0.7152, 0.0722));

  // Emissive + bloom eat AO: both per-pixel emissive and spatial bloom glow clear occlusion
  let emissiveAOLift = saturate(emissiveMag * params.emissiveIntensity * 0.5);
  let bloomAOLift = saturate(bloomMag * 2.0);
  let ao = max(aoRaw, max(emissiveAOLift, bloomAOLift));

  var color: vec3f;
  if (params.specularOnly > 0.5) {
    color = specular * params.lightColor * params.lightIntensity * NdotL;
  } else {
    let Lo = (kD * albedo / PI + specular) * params.lightColor * params.lightIntensity * NdotL;

    // IBL ambient: split-sum approximation
    let envSize = textureDimensions(envMap);
    let hasEnvMap = envSize.x > 1u; // 1x1 = placeholder, no real env map loaded
    var ambient: vec3f;
    if (hasEnvMap) {
      // Diffuse IBL: sample environment along bent normal for AO-aware irradiance
      let bentOct = aoSample.gb;
      let bentNormal = octDecode(bentOct);
      let diffuseDir = normalize(mix(N, bentNormal, 0.5)); // blend surface normal with bent normal
      let maxLod = log2(f32(envSize.x));
      let diffuseLod = max(maxLod - 2.0, 3.0); // ~4x4 to 16x8 texels, scales with env map size
      let irradiance = sampleEnvEquirectLod(diffuseDir, diffuseLod);
      let diffuseIBL = kD * albedo * irradiance;

      // Specular IBL: sample environment along reflection, roughness selects mip level
      let R = reflect(-V, N);
      let specLod = roughness * maxLod;
      let prefilteredColor = sampleEnvEquirectLod(R, specLod);
      let brdfCoord = vec2i(clamp(vec2f(NdotV, roughness) * 255.0, vec2f(0.0), vec2f(255.0)));
      let brdfSample = textureLoad(brdfLUT, brdfCoord, 0).rg;
      let F_ibl = fresnelSchlickRoughness(NdotV, F0, roughness);
      // Attenuate at extreme grazing angles to prevent Fresnel blowout on splat edges
      let grazingFade = smoothstep(0.0, 0.1, NdotV);
      let specularIBL = prefilteredColor * (F_ibl * brdfSample.x + brdfSample.y) * grazingFade;

      ambient = (diffuseIBL + specularIBL) * ao;
    } else {
      ambient = params.ambientColor * albedo * ao;
    }

    color = ambient + Lo;
  }

  // Reinhard tonemap in linear space, then convert back to sRGB for display
  let tonemapped = color / (color + vec3f(1.0));
  var mapped = linearToSrgb(tonemapped);

  // Emissive: additive AFTER tonemapping so it punches through bright
  if (emissiveMag > params.emissiveThreshold) {
    mapped += emissiveRaw * params.emissiveIntensity;
  }

  textureStore(outputLit, px, vec4f(mapped, splatOpacity));
}
