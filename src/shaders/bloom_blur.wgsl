// Separable Gaussian blur for bloom. Run twice: horizontal then vertical.
// 13-tap Gaussian kernel (sigma = 4.0).
// Dispatch: ceil(width/8) x ceil(height/8)

struct Params {
  direction: vec2f,  // (1/width, 0) for horizontal, (0, 1/height) for vertical
  texelSize: vec2f,  // 1.0 / resolution
};

@group(0) @binding(0) var inputTex: texture_2d<f32>;
@group(0) @binding(1) var outputTex: texture_storage_2d<rgba16float, write>;
@group(0) @binding(2) var<uniform> params: Params;
@group(0) @binding(3) var blurSampler: sampler;

// 13-tap Gaussian weights (sigma = 4.0, properly normalized, center > all offsets)
const OFFSETS = array<f32, 7>(0.0, 1.0, 2.0, 3.0, 4.0, 5.0, 6.0);
const WEIGHTS = array<f32, 7>(0.1112202001, 0.1077983143, 0.0981514821, 0.0839534116, 0.0674584614, 0.0509203181, 0.0361079124);

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let outSize = textureDimensions(outputTex);
  if (gid.x >= outSize.x || gid.y >= outSize.y) { return; }

  let uv = (vec2f(gid.xy) + 0.5) * params.texelSize;

  // Center tap
  var result = textureSampleLevel(inputTex, blurSampler, uv, 0.0).rgb * WEIGHTS[0];

  // Symmetric taps
  for (var i = 1; i < 7; i++) {
    let offset = params.direction * OFFSETS[i];
    result += textureSampleLevel(inputTex, blurSampler, uv + offset, 0.0).rgb * WEIGHTS[i];
    result += textureSampleLevel(inputTex, blurSampler, uv - offset, 0.0).rgb * WEIGHTS[i];
  }

  textureStore(outputTex, vec2i(gid.xy), vec4f(result, 1.0));
}
