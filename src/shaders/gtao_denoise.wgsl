// GTAO denoise: 3x3 edge-aware spatial filter using shared memory.
// Adapted from XeGTAO / Kaminos ao-compute.js (MIT license).

struct Params {
  resolution: vec2f,
  depthThreshold: f32,
  _pad: f32,
};

@group(0) @binding(0) var inputAO: texture_2d<f32>;
@group(0) @binding(1) var depthTex: texture_2d<f32>;
@group(0) @binding(2) var outputAO: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var<uniform> params: Params;

var<workgroup> sharedAO: array<vec4f, 324>;   // (16+2)*(16+2) = 18*18, rgba: ao + bent normal oct
var<workgroup> sharedDepth: array<f32, 324>;

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let res = vec2i(params.resolution);
  let coord = vec2i(gid.xy);

  let sharedW = 18u;
  let si = (lid.y + 1u) * sharedW + (lid.x + 1u);
  let loadCoord = clamp(coord, vec2i(0), res - vec2i(1));
  sharedAO[si] = textureLoad(inputAO, loadCoord, 0);
  sharedDepth[si] = textureLoad(depthTex, loadCoord, 0).r;

  // Load halo
  if (lid.x == 0u) {
    let hCoord = clamp(coord - vec2i(1, 0), vec2i(0), res - vec2i(1));
    sharedAO[si - 1u] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si - 1u] = textureLoad(depthTex, hCoord, 0).r;
  }
  if (lid.x == 15u) {
    let hCoord = clamp(coord + vec2i(1, 0), vec2i(0), res - vec2i(1));
    sharedAO[si + 1u] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si + 1u] = textureLoad(depthTex, hCoord, 0).r;
  }
  if (lid.y == 0u) {
    let hCoord = clamp(coord - vec2i(0, 1), vec2i(0), res - vec2i(1));
    sharedAO[si - sharedW] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si - sharedW] = textureLoad(depthTex, hCoord, 0).r;
  }
  if (lid.y == 15u) {
    let hCoord = clamp(coord + vec2i(0, 1), vec2i(0), res - vec2i(1));
    sharedAO[si + sharedW] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si + sharedW] = textureLoad(depthTex, hCoord, 0).r;
  }
  // Corners
  if (lid.x == 0u && lid.y == 0u) {
    let hCoord = clamp(coord - vec2i(1, 1), vec2i(0), res - vec2i(1));
    sharedAO[si - sharedW - 1u] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si - sharedW - 1u] = textureLoad(depthTex, hCoord, 0).r;
  }
  if (lid.x == 15u && lid.y == 0u) {
    let hCoord = clamp(coord + vec2i(1, -1), vec2i(0), res - vec2i(1));
    sharedAO[si - sharedW + 1u] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si - sharedW + 1u] = textureLoad(depthTex, hCoord, 0).r;
  }
  if (lid.x == 0u && lid.y == 15u) {
    let hCoord = clamp(coord + vec2i(-1, 1), vec2i(0), res - vec2i(1));
    sharedAO[si + sharedW - 1u] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si + sharedW - 1u] = textureLoad(depthTex, hCoord, 0).r;
  }
  if (lid.x == 15u && lid.y == 15u) {
    let hCoord = clamp(coord + vec2i(1, 1), vec2i(0), res - vec2i(1));
    sharedAO[si + sharedW + 1u] = textureLoad(inputAO, hCoord, 0);
    sharedDepth[si + sharedW + 1u] = textureLoad(depthTex, hCoord, 0).r;
  }

  workgroupBarrier();

  if (coord.x >= res.x || coord.y >= res.y) { return; }

  let centerDepth = sharedDepth[si];
  var totalWeight: f32 = 1.0;
  var totalAO: vec4f = sharedAO[si];

  for (var dy: i32 = -1; dy <= 1; dy = dy + 1) {
    for (var dx: i32 = -1; dx <= 1; dx = dx + 1) {
      if (dx == 0 && dy == 0) { continue; }
      let ni = i32(si) + dy * i32(sharedW) + dx;
      let nDepth = sharedDepth[ni];
      let nAO = sharedAO[ni];
      let depthDiff = abs(centerDepth - nDepth) / max(centerDepth, 0.001);
      let w = exp(-depthDiff * params.depthThreshold);
      totalWeight += w;
      totalAO += nAO * w;
    }
  }

  let result = totalAO / totalWeight;
  textureStore(outputAO, coord, result);
}
