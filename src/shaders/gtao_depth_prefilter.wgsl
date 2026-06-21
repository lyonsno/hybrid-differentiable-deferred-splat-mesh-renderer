// GTAO depth prefilter: linearize NDC depth + generate MIP levels via shared memory.
// Adapted from XeGTAO / Kaminos ao-compute.js (MIT license).
//
// Input: G-buffer NDC depth (r32float, clip.z/clip.w)
// Output: 3 MIP levels of linearized view-space depth

struct Params {
  nearFar: vec2f,       // near, far planes
  resolution: vec2f,    // full resolution
};

@group(0) @binding(0) var depthTexture: texture_2d<f32>;
@group(0) @binding(1) var outputMip0: texture_storage_2d<r32float, write>;
@group(0) @binding(2) var outputMip1: texture_storage_2d<r32float, write>;
@group(0) @binding(3) var outputMip2: texture_storage_2d<r32float, write>;
@group(0) @binding(4) var<uniform> params: Params;

var<workgroup> sharedDepths: array<f32, 256>; // 16x16

fn linearizeDepth(d: f32) -> f32 {
  let near = params.nearFar.x;
  let far = params.nearFar.y;
  // NDC depth → linear view-space depth
  return near * far / (far - d * (far - near));
}

@compute @workgroup_size(16, 16)
fn main(@builtin(global_invocation_id) gid: vec3u, @builtin(local_invocation_id) lid: vec3u) {
  let coord = vec2i(gid.xy);
  let res = vec2i(params.resolution);
  let inBounds = coord.x < res.x && coord.y < res.y;

  let safeCoord = clamp(coord, vec2i(0), res - vec2i(1));
  let rawDepth = textureLoad(depthTexture, safeCoord, 0).r;
  let linDepth = linearizeDepth(rawDepth);

  if (inBounds) {
    textureStore(outputMip0, coord, vec4f(linDepth, 0.0, 0.0, 0.0));
  }

  let localIdx = lid.y * 16u + lid.x;
  sharedDepths[localIdx] = linDepth;
  workgroupBarrier();

  // MIP 1: 2x2 min downsample
  if (lid.x % 2u == 0u && lid.y % 2u == 0u) {
    let i = lid.y * 16u + lid.x;
    let d00 = sharedDepths[i];
    let d10 = sharedDepths[i + 1u];
    let d01 = sharedDepths[i + 16u];
    let d11 = sharedDepths[i + 17u];
    let mip1Val = min(min(d00, d10), min(d01, d11));
    if (inBounds) {
      textureStore(outputMip1, vec2i(gid.xy) / 2, vec4f(mip1Val, 0.0, 0.0, 0.0));
    }
    sharedDepths[localIdx] = mip1Val;
  }
  workgroupBarrier();

  // MIP 2: 4x4
  if (lid.x % 4u == 0u && lid.y % 4u == 0u) {
    let i = lid.y * 16u + lid.x;
    let d00 = sharedDepths[i];
    let d10 = sharedDepths[i + 2u];
    let d01 = sharedDepths[i + 32u];
    let d11 = sharedDepths[i + 34u];
    let mip2Val = min(min(d00, d10), min(d01, d11));
    if (inBounds) {
      textureStore(outputMip2, vec2i(gid.xy) / 4, vec4f(mip2Val, 0.0, 0.0, 0.0));
    }
  }
}
