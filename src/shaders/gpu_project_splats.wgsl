// Project all visible splats into a packed projection cache.
// One thread per splat. Writes 8 u32 per splat:
//   [0] centerPx.x (f32)
//   [1] centerPx.y (f32)
//   [2] inverseCov2d.x (f32)
//   [3] inverseCov2d.y (f32)
//   [4] inverseCov2d.z (f32)
//   [5] pack2x16float(roughness, metalness) — per-splat PBR material
//   [6] pack2x16float(opacity, 0)
//   [7] tileBounds packed as u8x4 (minTileX, minTileY, maxTileX, maxTileY)
//
// Invisible splats (behind camera, zero radius) get sentinel values so
// downstream passes can skip them cheaply.

const PROJ_STRIDE = 8u;
const COMPACT_FOOTPRINT_SIGMA_RADIUS = 3.0;
const COMPACT_FOOTPRINT_EPSILON = 0.000000001;
const MIN_SPLAT_CLIP_W = 0.0001;
const COV_LOW_PASS = 0.3;

struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  totalTileRefs: u32,
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> scales: array<f32>;
@group(0) @binding(3) var<storage, read> rotations: array<f32>;
@group(0) @binding(4) var<storage, read> opacities: array<f32>;
@group(0) @binding(5) var<storage, read> sortedIndices: array<u32>;
@group(0) @binding(6) var<storage, read_write> projCache: array<u32>;
@group(0) @binding(7) var<storage, read_write> depthBuffer: array<u32>;
@group(0) @binding(8) var<storage, read> roughnessData: array<f32>;
@group(0) @binding(9) var<storage, read> metalnessData: array<f32>;

// --- Projection math (same as composite shader) ---

fn rotateAxis(rotation: vec4f, axis: vec3f) -> vec3f {
  let q = rotation / max(length(rotation), 0.000001);
  let u = vec3f(q.y, q.z, q.w);
  return axis + 2.0 * cross(u, cross(u, axis) + q.x * axis);
}

// Octahedral normal encoding: vec3f unit normal → vec2f in [-1,1]
fn octEncode(n: vec3f) -> vec2f {
  let sum = abs(n.x) + abs(n.y) + abs(n.z);
  var p = n.xy / sum;
  if (n.z < 0.0) {
    p = (1.0 - abs(p.yx)) * select(vec2f(-1.0), vec2f(1.0), p >= vec2f(0.0));
  }
  return p;
}

fn viewProjectionLinearRow(row: u32) -> vec3f {
  return vec3f(frame.viewProj[0][row], frame.viewProj[1][row], frame.viewProj[2][row]);
}

fn projectAxisJacobian(axis: vec3f, centerClip: vec4f) -> vec2f {
  let viewProjRow0 = viewProjectionLinearRow(0u);
  let viewProjRow1 = viewProjectionLinearRow(1u);
  let viewProjRow3 = viewProjectionLinearRow(3u);
  let safeW = max(abs(centerClip.w), MIN_SPLAT_CLIP_W);
  let clipW2 = safeW * safeW;
  let viewJacobianX = (centerClip.w * viewProjRow0 - centerClip.x * viewProjRow3) / clipW2;
  let viewJacobianY = (centerClip.w * viewProjRow1 - centerClip.y * viewProjRow3) / clipW2;
  return vec2f(dot(viewJacobianX, axis), dot(viewJacobianY, axis));
}

@compute @workgroup_size(256)
fn project_splats(@builtin(global_invocation_id) globalId: vec3u) {
  let sortRank = globalId.x;
  if (sortRank >= frame.splatCount) { return; }
  let splatId = sortedIndices[sortRank];
  if (splatId >= frame.splatCount) { return; }

  let base = sortRank * PROJ_STRIDE;

  // Project center
  let posBase = splatId * 3u;
  let center = vec3f(positions[posBase], positions[posBase + 1u], positions[posBase + 2u]);
  let centerClip = frame.viewProj * vec4f(center, 1.0);

  // Behind camera → write sentinel
  if (centerClip.w <= 0.0) {
    projCache[base + 7u] = 0xFFFFFFFFu; // sentinel: invisible
    depthBuffer[sortRank] = 0xFFFFFFFFu;
    return;
  }

  let safeW = max(centerClip.w, MIN_SPLAT_CLIP_W);
  let centerNdc = centerClip.xy / safeW;
  let centerPx = vec2f(
    (centerNdc.x * 0.5 + 0.5) * frame.viewport.x,
    (1.0 - (centerNdc.y * 0.5 + 0.5)) * frame.viewport.y,
  );
  let depthNdc = centerClip.z / safeW;

  // Build covariance
  let vecBase = splatId * 3u;
  let quatBase = splatId * 4u;
  let scaleLog = vec3f(scales[vecBase], scales[vecBase + 1u], scales[vecBase + 2u]);
  let rotation = vec4f(rotations[quatBase], rotations[quatBase + 1u], rotations[quatBase + 2u], rotations[quatBase + 3u]);
  let scale = exp(scaleLog);
  let axis0 = rotateAxis(rotation, vec3f(1.0, 0.0, 0.0)) * scale.x;
  let axis1 = rotateAxis(rotation, vec3f(0.0, 1.0, 0.0)) * scale.y;
  let axis2 = rotateAxis(rotation, vec3f(0.0, 0.0, 1.0)) * scale.z;

  // Normal: smallest-scale axis is the thin direction of the ellipsoid.
  // axis0/1/2 already have scale baked in, so the shortest one is the normal direction.
  let len0 = dot(axis0, axis0);
  let len1 = dot(axis1, axis1);
  let len2 = dot(axis2, axis2);
  let minLen = min(len0, min(len1, len2));
  let normalAxis = select(select(axis2, axis1, len1 == minLen), axis0, len0 == minLen);
  let normal = normalize(normalAxis);

  let viewportScale = vec2f(frame.viewport.x, frame.viewport.y) * 0.5;
  let a0 = projectAxisJacobian(axis0, centerClip) * viewportScale;
  let a1 = projectAxisJacobian(axis1, centerClip) * viewportScale;
  let a2 = projectAxisJacobian(axis2, centerClip) * viewportScale;

  let covXX = a0.x * a0.x + a1.x * a1.x + a2.x * a2.x + COV_LOW_PASS;
  let covXY = a0.x * a0.y + a1.x * a1.y + a2.x * a2.y;
  let covYY = a0.y * a0.y + a1.y * a1.y + a2.y * a2.y + COV_LOW_PASS;

  let mid = 0.5 * (covXX + covYY);
  let det = max(covXX * covYY - covXY * covXY, 0.1);
  let lambda = mid + sqrt(max(mid * mid - det, 0.1));
  let radius = ceil(COMPACT_FOOTPRINT_SIGMA_RADIUS * sqrt(lambda));

  // Invisible splat (degenerate projection)
  if (radius <= 0.0) {
    projCache[base + 7u] = 0xFFFFFFFFu;
    depthBuffer[sortRank] = 0xFFFFFFFFu;
    return;
  }

  let detFull = max(covXX * covYY - covXY * covXY, 0.000001);
  let detInv = 1.0 / detFull;
  let inverseCov2d = vec3f(covYY * detInv, -covXY * detInv, covXX * detInv);
  let sourceOpacity = clamp(opacities[splatId], 0.0, 0.99);

  // Compute tile bounds
  let tileSize = max(frame.tileSizePx, 1.0);
  let maxTile = max(frame.tileGrid, vec2u(1u)) - vec2u(1u);
  let minPx = max(centerPx - vec2f(radius), vec2f(0.0));
  let maxPx = min(centerPx + vec2f(radius), frame.viewport);
  let minTileX = min(u32(floor(minPx.x / tileSize)), maxTile.x);
  let minTileY = min(u32(floor(minPx.y / tileSize)), maxTile.y);
  let maxTileX = min(u32(floor(max((maxPx.x - COMPACT_FOOTPRINT_EPSILON) / tileSize, 0.0))), maxTile.x);
  let maxTileY = min(u32(floor(max((maxPx.y - COMPACT_FOOTPRINT_EPSILON) / tileSize, 0.0))), maxTile.y);

  // Write projection cache
  projCache[base + 0u] = bitcast<u32>(centerPx.x);
  projCache[base + 1u] = bitcast<u32>(centerPx.y);
  projCache[base + 2u] = bitcast<u32>(inverseCov2d.x);
  projCache[base + 3u] = bitcast<u32>(inverseCov2d.y);
  projCache[base + 4u] = bitcast<u32>(inverseCov2d.z);
  let roughness = roughnessData[splatId];
  let metalness = metalnessData[splatId];
  projCache[base + 5u] = pack2x16float(vec2f(roughness, metalness)); // per-splat PBR material
  projCache[base + 6u] = pack2x16float(vec2f(radius, sourceOpacity));
  depthBuffer[sortRank] = bitcast<u32>(depthNdc); // separate depth buffer for per-tile sort
  // Pack tile bounds as 4 bytes (supports up to 255 tiles per axis)
  projCache[base + 7u] = (minTileX & 0xFFu) | ((minTileY & 0xFFu) << 8u)
                        | ((maxTileX & 0xFFu) << 16u) | ((maxTileY & 0xFFu) << 24u);
}
