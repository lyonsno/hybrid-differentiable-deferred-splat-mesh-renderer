// Alpha-preserving present shader with host renderer depth texture occlusion.
// Kaminos supplies a WebGPU depth texture rendered on the same GPUDevice. The
// overlay compares that host depth against the splat G-buffer's NDC depth.

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

struct HostDepthParams {
  viewProj: mat4x4f,
  invViewProj: mat4x4f,
  viewMatrix: mat4x4f,
  depthParams: vec4f,
};

@group(0) @binding(0) var tileSampler: sampler;
@group(0) @binding(1) var tileTexture: texture_2d<f32>;
@group(0) @binding(2) var splatDepthTexture: texture_2d<f32>;
@group(0) @binding(3) var hostDepthTexture: texture_depth_2d;
@group(0) @binding(4) var<uniform> params: HostDepthParams;

@vertex
fn vs(@builtin(vertex_index) vertexIndex: u32) -> VertexOut {
  let positions = array<vec2f, 3>(
    vec2f(-1.0, -1.0),
    vec2f(3.0, -1.0),
    vec2f(-1.0, 3.0),
  );
  let position = positions[vertexIndex];
  var out: VertexOut;
  out.position = vec4f(position, 0.0, 1.0);
  out.uv = position * vec2f(0.5, -0.5) + vec2f(0.5, 0.5);
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let color = textureSample(tileTexture, tileSampler, in.uv);
  let splatDims = vec2i(textureDimensions(splatDepthTexture));
  let splatPx = clamp(vec2i(in.uv * vec2f(splatDims)), vec2i(0), splatDims - vec2i(1));
  let splatDepth = textureLoad(splatDepthTexture, splatPx, 0).r;

  let hostDims = vec2i(textureDimensions(hostDepthTexture));
  let hostPx = clamp(vec2i(in.uv * vec2f(hostDims)), vec2i(0), hostDims - vec2i(1));
  let hostDepth = textureLoad(hostDepthTexture, hostPx, 0);

  let depthBias = params.depthParams.x;
  let reversedDepth = params.depthParams.y > 0.5;
  let hostDepthInSplatSpace = select(hostDepth, 1.0 - hostDepth, reversedDepth);
  let hostDepthValid = hostDepth > 0.000001 && hostDepth < 0.999999;
  let splatDepthValid = splatDepth > 0.000001 && splatDepth < 0.999999;
  let visible = splatDepthValid && (!hostDepthValid || splatDepth <= hostDepthInSplatSpace + depthBias);
  let alpha = select(0.0, color.a, visible);
  return vec4f(color.rgb * alpha, alpha);
}
