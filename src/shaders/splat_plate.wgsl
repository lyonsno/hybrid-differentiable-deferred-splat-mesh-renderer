struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  splatScale: f32,
  minRadiusPx: f32,
};

struct SplatRow {
  position: vec3f,
  radius: f32,
  color: vec3f,
  opacity: f32,
};

struct VertexOut {
  @builtin(position) position: vec4f,
  @location(0) color: vec3f,
  @location(1) alpha: f32,
  @location(2) local: vec2f,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(1) @binding(0) var<storage, read> splats: array<SplatRow>;
@group(1) @binding(1) var<storage, read> sortedIndices: array<u32>;

const quadCorners = array<vec2f, 6>(
  vec2f(-1.0, -1.0),
  vec2f( 1.0, -1.0),
  vec2f(-1.0,  1.0),
  vec2f(-1.0,  1.0),
  vec2f( 1.0, -1.0),
  vec2f( 1.0,  1.0),
);

@vertex
fn vs(
  @builtin(vertex_index) vertexIndex: u32,
  @builtin(instance_index) instanceIndex: u32,
) -> VertexOut {
  let splatId = sortedIndices[instanceIndex];
  let splat = splats[splatId];
  let centerClip = frame.viewProj * vec4f(splat.position, 1.0);
  let local = quadCorners[vertexIndex];
  let viewportMin = max(min(frame.viewport.x, frame.viewport.y), 1.0);
  let radiusPx = max(splat.radius * frame.splatScale, frame.minRadiusPx);
  let radiusNdc = (2.0 * radiusPx) / viewportMin;

  var out: VertexOut;
  out.position = vec4f(
    centerClip.xy + local * radiusNdc * centerClip.w,
    centerClip.z,
    centerClip.w,
  );
  out.color = clamp(splat.color, vec3f(0.0), vec3f(1.0));
  out.alpha = clamp(splat.opacity, 0.0, 1.0);
  out.local = local;
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let r2 = dot(in.local, in.local);
  if (r2 > 1.0) {
    discard;
  }

  let alpha = in.alpha * exp(-2.0 * r2);
  return vec4f(in.color, alpha);
}
