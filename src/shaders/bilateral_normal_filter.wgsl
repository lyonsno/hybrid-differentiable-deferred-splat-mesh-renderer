// Bilateral filter on G-buffer normals: smooths normals while preserving depth edges.
// Uses depth as edge guide — where depth is continuous, normals are averaged;
// where depth has a discontinuity, normals are preserved.
//
// Reads oct-encoded normals from r32uint texture, writes filtered normals back.
// Dispatch: ceil(width/8) x ceil(height/8)

struct Params {
  resolution: vec2f,
  spatialSigma: f32,   // spatial weight falloff (pixels)
  depthSigma: f32,     // depth edge sensitivity (smaller = sharper edges)
  normalSigma: f32,    // normal similarity weight
  kernelRadius: f32,   // filter radius in pixels
  _pad: vec2f,
};

@group(0) @binding(0) var inputNormals: texture_2d<u32>;
@group(0) @binding(1) var depthTex: texture_2d<f32>;
@group(0) @binding(2) var outputNormals: texture_storage_2d<r32uint, write>;
@group(0) @binding(3) var<uniform> params: Params;

fn octDecode(e: vec2f) -> vec3f {
  var n = vec3f(e.xy, 1.0 - abs(e.x) - abs(e.y));
  if (n.z < 0.0) {
    n = vec3f((1.0 - abs(n.yx)) * select(vec2f(-1.0), vec2f(1.0), n.xy >= vec2f(0.0)), n.z);
  }
  return normalize(n);
}

fn octEncode(n: vec3f) -> vec2f {
  let sum = abs(n.x) + abs(n.y) + abs(n.z);
  var p = n.xy / sum;
  if (n.z < 0.0) {
    p = (1.0 - abs(p.yx)) * select(vec2f(-1.0), vec2f(1.0), p >= vec2f(0.0));
  }
  return p;
}

@compute @workgroup_size(8, 8)
fn main(@builtin(global_invocation_id) gid: vec3u) {
  let coord = vec2i(gid.xy);
  let res = vec2i(params.resolution);
  if (coord.x >= res.x || coord.y >= res.y) { return; }

  let centerPacked = textureLoad(inputNormals, coord, 0).r;
  let centerNormal = octDecode(unpack2x16float(centerPacked));
  let centerDepth = textureLoad(depthTex, coord, 0).r;

  // Background: pass through
  if (centerDepth >= 0.9999) {
    textureStore(outputNormals, coord, vec4u(centerPacked, 0u, 0u, 0u));
    return;
  }

  var weightedNormal = vec3f(0.0);
  var totalWeight: f32 = 0.0;
  let radius = i32(params.kernelRadius);

  for (var dy = -radius; dy <= radius; dy++) {
    for (var dx = -radius; dx <= radius; dx++) {
      let sampleCoord = clamp(coord + vec2i(dx, dy), vec2i(0), res - vec2i(1));
      let samplePacked = textureLoad(inputNormals, sampleCoord, 0).r;
      let sampleNormal = octDecode(unpack2x16float(samplePacked));
      let sampleDepth = textureLoad(depthTex, sampleCoord, 0).r;

      // Spatial weight: Gaussian falloff with distance
      let dist2 = f32(dx * dx + dy * dy);
      let spatialW = exp(-dist2 / (2.0 * params.spatialSigma * params.spatialSigma));

      // Depth weight: suppress across depth discontinuities
      let depthDiff = abs(centerDepth - sampleDepth) / max(centerDepth, 0.001);
      let depthW = exp(-depthDiff * depthDiff / (2.0 * params.depthSigma * params.depthSigma));

      // Normal similarity weight: don't average across sharp normal changes
      let normalDot = max(dot(centerNormal, sampleNormal), 0.0);
      let normalW = pow(normalDot, 1.0 / max(params.normalSigma, 0.01));

      let w = spatialW * depthW * normalW;
      weightedNormal += sampleNormal * w;
      totalWeight += w;
    }
  }

  let filteredNormal = normalize(weightedNormal / max(totalWeight, 0.0001));
  textureStore(outputNormals, coord, vec4u(pack2x16float(octEncode(filteredNormal)), 0u, 0u, 0u));
}
