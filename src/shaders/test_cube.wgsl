struct FrameUniforms {
  viewProj: mat4x4f,
  time: f32,
  _pad0: f32,
  _pad1: f32,
  _pad2: f32,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;

struct VertexOut {
  @builtin(position) pos: vec4f,
  @location(0) color: vec3f,
  @location(1) normal: vec3f,
};

// Cube: 36 vertices (6 faces × 2 triangles × 3 verts)
const positions = array<vec3f, 8>(
  vec3f(-0.5, -0.5, -0.5),
  vec3f( 0.5, -0.5, -0.5),
  vec3f( 0.5,  0.5, -0.5),
  vec3f(-0.5,  0.5, -0.5),
  vec3f(-0.5, -0.5,  0.5),
  vec3f( 0.5, -0.5,  0.5),
  vec3f( 0.5,  0.5,  0.5),
  vec3f(-0.5,  0.5,  0.5),
);

const indices = array<u32, 36>(
  // front
  4u, 5u, 6u, 4u, 6u, 7u,
  // back
  1u, 0u, 3u, 1u, 3u, 2u,
  // right
  5u, 1u, 2u, 5u, 2u, 6u,
  // left
  0u, 4u, 7u, 0u, 7u, 3u,
  // top
  7u, 6u, 2u, 7u, 2u, 3u,
  // bottom
  0u, 1u, 5u, 0u, 5u, 4u,
);

const normals = array<vec3f, 6>(
  vec3f( 0.0,  0.0,  1.0),
  vec3f( 0.0,  0.0, -1.0),
  vec3f( 1.0,  0.0,  0.0),
  vec3f(-1.0,  0.0,  0.0),
  vec3f( 0.0,  1.0,  0.0),
  vec3f( 0.0, -1.0,  0.0),
);

const face_colors = array<vec3f, 6>(
  vec3f(0.9, 0.2, 0.2),  // front - red
  vec3f(0.2, 0.9, 0.2),  // back - green
  vec3f(0.2, 0.2, 0.9),  // right - blue
  vec3f(0.9, 0.9, 0.2),  // left - yellow
  vec3f(0.9, 0.2, 0.9),  // top - magenta
  vec3f(0.2, 0.9, 0.9),  // bottom - cyan
);

@vertex
fn vs(@builtin(vertex_index) vid: u32) -> VertexOut {
  let idx = indices[vid];
  let face = vid / 6u;
  let p = positions[idx];

  // Slow rotation
  let angle = frame.time * 0.5;
  let c = cos(angle);
  let s = sin(angle);
  let rotated = vec3f(
    p.x * c - p.z * s,
    p.y,
    p.x * s + p.z * c,
  );

  var out: VertexOut;
  out.pos = frame.viewProj * vec4f(rotated, 1.0);
  out.color = face_colors[face];
  let n = normals[face];
  out.normal = vec3f(n.x * c - n.z * s, n.y, n.x * s + n.z * c);
  return out;
}

@fragment
fn fs(in: VertexOut) -> @location(0) vec4f {
  let n = normalize(in.normal);
  let light_dir = normalize(vec3f(0.5, 1.0, 0.3));
  let ndotl = max(dot(n, light_dir), 0.0);
  let ambient = 0.15;
  let lit = in.color * (ambient + ndotl * 0.85);
  return vec4f(lit, 1.0);
}
