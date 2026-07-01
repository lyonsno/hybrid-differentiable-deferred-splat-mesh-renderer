// Alpha-preserving present shader with explicit proxy-geometry depth occlusion.
// This does not share the host renderer's depth texture. Kaminos sends concrete
// proxy planes, and the overlay clips splat alpha when those planes are closer.

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) uv: vec2f,
};

struct ProxyPlane {
  centerRadius: vec4f,
  normalBias: vec4f,
};

struct ProxyDepthParams {
  viewProj: mat4x4f,
  invViewProj: mat4x4f,
  proxyCount: vec4f,
  planes: array<ProxyPlane, 4>,
};

@group(0) @binding(0) var tileSampler: sampler;
@group(0) @binding(1) var tileTexture: texture_2d<f32>;
@group(0) @binding(2) var splatDepthTexture: texture_2d<f32>;
@group(0) @binding(3) var<uniform> params: ProxyDepthParams;

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

fn unproject(clip: vec4f) -> vec3f {
  let world = params.invViewProj * clip;
  return world.xyz / max(abs(world.w), 1e-8);
}

fn proxyAdjustedDepth(uv: vec2f) -> f32 {
  let ndc = vec2f(uv.x * 2.0 - 1.0, 1.0 - uv.y * 2.0);
  let nearWorld = unproject(vec4f(ndc, 0.0, 1.0));
  let farWorld = unproject(vec4f(ndc, 1.0, 1.0));
  let ray = farWorld - nearWorld;
  var bestDepth = 1.000001;
  let count = min(u32(params.proxyCount.x), 4u);

  for (var i = 0u; i < count; i = i + 1u) {
    let plane = params.planes[i];
    let center = plane.centerRadius.xyz;
    let radius = plane.centerRadius.w;
    let normal = normalize(plane.normalBias.xyz);
    let bias = plane.normalBias.w;
    let denom = dot(ray, normal);
    if (abs(denom) > 1e-6) {
      let t = dot(center - nearWorld, normal) / denom;
      if (t >= 0.0 && t <= 1.0) {
        let hit = nearWorld + ray * t;
        if (distance(hit, center) <= radius) {
          let clip = params.viewProj * vec4f(hit, 1.0);
          let depth = clip.z / max(abs(clip.w), 1e-8);
          if (depth >= 0.0 && depth <= 1.0) {
            bestDepth = min(bestDepth, depth + bias);
          }
        }
      }
    }
  }
  return bestDepth;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let color = textureSample(tileTexture, tileSampler, in.uv);
  let dims = vec2i(textureDimensions(splatDepthTexture));
  let px = clamp(vec2i(in.uv * vec2f(dims)), vec2i(0), dims - vec2i(1));
  let splatDepth = textureLoad(splatDepthTexture, px, 0).r;
  let occluderDepth = proxyAdjustedDepth(in.uv);
  let visible = splatDepth <= occluderDepth || splatDepth >= 0.9999;
  let alpha = select(0.0, color.a, visible);
  return vec4f(color.rgb * alpha, alpha);
}
