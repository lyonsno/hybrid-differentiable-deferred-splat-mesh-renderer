// G-buffer debug visualization — fullscreen triangle blit.
// Two entry points: depth (r32float) and normal (r32uint oct-encoded).

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

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

// --- Depth visualization ---
@group(0) @binding(0) var depthSampler: sampler;
@group(0) @binding(1) var depthTexture: texture_2d<f32>;

@fragment
fn fs_depth(in: VertexOut) -> @location(0) vec4f {
  let depth = textureSampleLevel(depthTexture, depthSampler, in.uv, 0.0).r;
  let vis = pow(1.0 - saturate(depth), 0.4);
  return vec4f(vis, vis, vis, 1.0);
}

// --- Normal visualization ---
@group(1) @binding(0) var normalTexture: texture_2d<u32>;
@group(1) @binding(1) var materialTexture: texture_2d<u32>;

fn octDecode(oct: vec2f) -> vec3f {
  var n = vec3f(oct.x, oct.y, 1.0 - abs(oct.x) - abs(oct.y));
  if (n.z < 0.0) {
    n = vec3f((1.0 - abs(n.yx)) * select(vec2f(-1.0), vec2f(1.0), n.xy >= vec2f(0.0)), n.z);
  }
  return normalize(n);
}

@fragment
fn fs_normal(in: VertexOut) -> @location(0) vec4f {
  let texSize = textureDimensions(normalTexture);
  let coord = vec2i(in.uv * vec2f(f32(texSize.x), f32(texSize.y)));
  let packed = textureLoad(normalTexture, coord, 0).r;
  let oct = unpack2x16float(packed);
  let normal = octDecode(oct);
  // Map normal [-1,1] to color [0,1]
  return vec4f(normal * 0.5 + 0.5, 1.0);
}

// --- Roughness visualization ---
@fragment
fn fs_roughness(in: VertexOut) -> @location(0) vec4f {
  let texSize = textureDimensions(materialTexture);
  let coord = vec2i(in.uv * vec2f(f32(texSize.x), f32(texSize.y)));
  let packed = textureLoad(materialTexture, coord, 0).r;
  let mat = unpack2x16float(packed);
  let roughness = mat.x;
  // Green = rough (matte), Red = smooth (shiny), Blue = metallic
  let metalness = mat.y;
  return vec4f(1.0 - roughness, roughness, metalness, 1.0);
}
