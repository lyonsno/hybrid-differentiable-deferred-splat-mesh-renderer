// Screen-space normal reconstruction from depth buffer.
// Computes per-pixel normals via finite differences on the G-buffer depth.
//
// Uses the improved method: for each pixel, compute both forward and backward
// differences in X and Y, pick the pair with the smaller absolute difference
// (avoids artifacts at depth discontinuities/silhouettes), then cross product.
//
// Dispatch: ceil(width/8) x ceil(height/8)

struct Params {
  viewport: vec2f,     // width, height
  nearFar: vec2f,      // near, far (for linearizing depth)
  viewProjInv: mat4x4f, // inverse viewProj for reconstructing view-space position
  cameraPos: vec3f,
  recoveryMode: f32,   // 0 = screen-space, 1 = grazing recovery, 2 = source pass-through
  grazingStart: f32,
  grazingEnd: f32,
  _pad: vec2f,
};

@group(0) @binding(0) var<uniform> params: Params;
@group(0) @binding(1) var depthTexture: texture_2d<f32>;
@group(0) @binding(2) var outputNormal: texture_storage_2d<r32uint, write>;
@group(0) @binding(3) var sourceNormalTexture: texture_2d<u32>;

fn reconstructViewPos(pixelCoord: vec2f, depth: f32) -> vec3f {
  let ndc = vec2f(
    pixelCoord.x / params.viewport.x * 2.0 - 1.0,
    1.0 - pixelCoord.y / params.viewport.y * 2.0,
  );
  let clip = vec4f(ndc, depth, 1.0);
  let world = params.viewProjInv * clip;
  return world.xyz / world.w;
}

fn octEncode(n: vec3f) -> vec2f {
  let sum = abs(n.x) + abs(n.y) + abs(n.z);
  var p = n.xy / sum;
  if (n.z < 0.0) {
    p = (1.0 - abs(p.yx)) * select(vec2f(-1.0), vec2f(1.0), p >= vec2f(0.0));
  }
  return p;
}

fn octDecode(oct: vec2f) -> vec3f {
  var n = vec3f(oct.x, oct.y, 1.0 - abs(oct.x) - abs(oct.y));
  if (n.z < 0.0) {
    n = vec3f((1.0 - abs(n.yx)) * select(vec2f(-1.0), vec2f(1.0), n.xy >= vec2f(0.0)), n.z);
  }
  return normalize(n);
}

fn faceForwardNormal(normal: vec3f, viewDir: vec3f) -> vec3f {
  let n = normalize(normal);
  let v = normalize(viewDir);
  return select(n, -n, dot(n, v) < 0.0);
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let px = vec2i(gid.xy);
  let size = vec2i(textureDimensions(depthTexture));
  if (px.x >= size.x || px.y >= size.y) { return; }

  let d = textureLoad(depthTexture, px, 0).r;

  // Background (depth = 1.0 or very close): pass source normals through in
  // recovery mode, otherwise write the neutral screen-normal value.
  if (d >= 0.9999) {
    let sourcePacked = textureLoad(sourceNormalTexture, px, 0).r;
    let packed = select(pack2x16float(vec2f(0.0, 0.0)), sourcePacked, params.recoveryMode > 0.5);
    textureStore(outputNormal, px, vec4u(packed, 0u, 0u, 0u));
    return;
  }

  let center = vec2f(f32(px.x) + 0.5, f32(px.y) + 0.5);
  let posC = reconstructViewPos(center, d);

  // Sample neighbors, clamped to texture bounds
  let dL = textureLoad(depthTexture, max(px - vec2i(1, 0), vec2i(0)), 0).r;
  let dR = textureLoad(depthTexture, min(px + vec2i(1, 0), size - vec2i(1)), 0).r;
  let dU = textureLoad(depthTexture, max(px - vec2i(0, 1), vec2i(0)), 0).r;
  let dD = textureLoad(depthTexture, min(px + vec2i(0, 1), size - vec2i(1)), 0).r;

  // Pick the neighbor pair with smaller depth difference (avoids silhouette artifacts)
  var ddx: vec3f;
  if (abs(dL - d) < abs(dR - d)) {
    let posL = reconstructViewPos(center - vec2f(1.0, 0.0), dL);
    ddx = posC - posL;
  } else {
    let posR = reconstructViewPos(center + vec2f(1.0, 0.0), dR);
    ddx = posR - posC;
  }

  var ddy: vec3f;
  if (abs(dU - d) < abs(dD - d)) {
    let posU = reconstructViewPos(center - vec2f(0.0, 1.0), dU);
    ddy = posC - posU;
  } else {
    let posD = reconstructViewPos(center + vec2f(0.0, 1.0), dD);
    ddy = posD - posC;
  }

  let viewDir = normalize(params.cameraPos - posC);
  let screenNormal = faceForwardNormal(normalize(cross(ddy, ddx)), viewDir);

  let sourcePacked = textureLoad(sourceNormalTexture, px, 0).r;
  let sourceNormal = faceForwardNormal(octDecode(unpack2x16float(sourcePacked)), viewDir);

  var normal = screenNormal;
  if (params.recoveryMode > 1.5) {
    normal = sourceNormal;
  } else if (params.recoveryMode > 0.5) {
    let sourceNdotV = max(dot(sourceNormal, viewDir), 0.0);
    let screenBlend = 1.0 - smoothstep(params.grazingStart, params.grazingEnd, sourceNdotV);
    normal = normalize(mix(sourceNormal, screenNormal, screenBlend));
  }

  textureStore(outputNormal, px, vec4u(pack2x16float(octEncode(normal)), 0u, 0u, 0u));
}
