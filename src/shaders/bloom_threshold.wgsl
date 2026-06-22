// Extract emissive pixels for bloom from material G-buffer.
// Reads packed emissive from rgba32uint material texture (.gb channels).
// Dispatch: ceil(outWidth/8) x ceil(outHeight/8)

struct Params {
  threshold: f32,
  softKnee: f32,
  emissiveIntensity: f32,
  _pad: f32,
};

@group(0) @binding(0) var materialTex: texture_2d<u32>; // rgba32uint: .r=mat, .g=emissive_rg, .b=emissive_b
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let outSize = textureDimensions(outputTex);
  if (gid.x >= outSize.x || gid.y >= outSize.y) { return; }

  // Sample 2x2 box from full-res material texture, extract emissive
  let srcCoord = vec2i(gid.xy) * 2;
  var emissiveSum = vec3f(0.0);
  for (var dy = 0; dy < 2; dy++) {
    for (var dx = 0; dx < 2; dx++) {
      let matSample = textureLoad(materialTex, srcCoord + vec2i(dx, dy), 0);
      let emRG = unpack2x16float(matSample.g);
      let emB = unpack2x16float(matSample.b).x;
      emissiveSum += vec3f(emRG.x, emRG.y, emB);
    }
  }
  let emissive = emissiveSum * 0.25 * params.emissiveIntensity;

  // Soft threshold
  let luminance = dot(emissive, vec3f(0.2126, 0.7152, 0.0722));
  let knee = params.threshold * params.softKnee;
  let soft = luminance - params.threshold + knee;
  let contribution = max(soft, 0.0) / max(knee * 2.0, 0.0001);
  let weight = min(contribution * contribution, 1.0);

  textureStore(outputTex, vec2i(gid.xy), vec4f(emissive * weight, 1.0));
}
