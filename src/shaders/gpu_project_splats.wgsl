// Project all visible splats into a packed projection cache.
// One thread per splat. Writes 11 u32 per splat:
//   [0] centerPx.x (f32)
//   [1] centerPx.y (f32)
//   [2] inverseCov2d.x (f32)
//   [3] inverseCov2d.y (f32)
//   [4] inverseCov2d.z (f32)
//   [5] pack2x16float(roughness, metalness) — per-splat PBR material
//   [6] pack2x16float(radius, sourceOpacity)
//   [7] tileBounds packed as u8x4 (minTileX, minTileY, maxTileX, maxTileY)
//   [8] oct-encoded normal as r32uint (pack2x16float of octahedral xy)
//   [9] pack2x16float(color.r, color.g) — SH-evaluated view-dependent color
//  [10] pack2x16float(color.b, 0.0)
//
// Invisible splats (behind camera, zero radius) get sentinel values so
// downstream passes can skip them cheaply.

const PROJ_STRIDE = 11u;
const COMPACT_FOOTPRINT_SIGMA_RADIUS = 3.0;
const COMPACT_FOOTPRINT_EPSILON = 0.000000001;
const MIN_SPLAT_CLIP_W = 0.0001;
const COV_LOW_PASS = 0.3;

struct FrameUniforms {
  viewProj: mat4x4f,       // offset 0,  size 64
  viewport: vec2f,          // offset 64, size 8
  tileSizePx: f32,          // offset 72, size 4
  debugMode: f32,           // offset 76, size 4
  tileGrid: vec2u,          // offset 80, size 8
  splatCount: u32,          // offset 88, size 4
  totalTileRefs: u32,       // offset 92, size 4
  splatScale: f32,          // offset 96, size 4
  shDegree: u32,            // offset 100, size 4
  _pad0: vec2u,             // offset 104, size 8 (pad to align cameraPos at 112)
  cameraPos: vec3f,         // offset 112, size 12 (align 16)
  _pad1: f32,               // offset 124, size 4
  viewMatrix: mat4x4f,      // offset 128, size 64
  focal: vec2f,             // offset 192, size 8 (viewport * proj[0][0] * 0.5, viewport * proj[1][1] * 0.5)
  _pad2: vec2f,             // offset 200, size 8 → struct size 208
};

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> scales: array<f32>;
@group(0) @binding(3) var<storage, read> rotations: array<f32>;
@group(0) @binding(4) var<storage, read> opacities: array<f32>;
@group(0) @binding(5) var<storage, read> sortedIndices: array<u32>;
@group(0) @binding(6) var<storage, read_write> projCache: array<u32>;
@group(0) @binding(7) var<storage, read_write> depthBuffer: array<u32>;
@group(0) @binding(8) var<storage, read> materialData: array<u32>;  // pack2x16float(roughness, metalness) per splat
@group(0) @binding(9) var<storage, read> normalData: array<f32>;  // per-splat nx,ny,nz (stride 3) or empty
@group(0) @binding(10) var<storage, read> shData: array<f32>;     // per-splat: [dc_r, dc_g, dc_b, sh1_r, sh1_g, sh1_b, ...]

// --- SH basis constants (3DGS reference) ---
const SH_C1 = 0.4886025119029199;
const SH_C2_0 = 1.0925484305920792;
const SH_C2_1 = 1.0925484305920792;
const SH_C2_2 = 0.31539156525252005;
const SH_C2_3 = 1.0925484305920792;
const SH_C2_4 = 0.5462742152960396;
const SH_C3_0 = 0.5900435899266435;
const SH_C3_1 = 2.890611442640554;
const SH_C3_2 = 0.4570457994644658;
const SH_C3_3 = 0.3731763325901154;
const SH_C3_4 = 0.4570457994644658;
const SH_C3_5 = 1.445305721320277;
const SH_C3_6 = 0.5900435899266435;

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

  // Build 3D covariance via scaled rotation matrix (matches PlayCanvas compute-gsplat-common.js)
  let vecBase = splatId * 3u;
  let quatBase = splatId * 4u;
  let scaleLog = vec3f(scales[vecBase], scales[vecBase + 1u], scales[vecBase + 2u]);
  let rotation = vec4f(rotations[quatBase], rotations[quatBase + 1u], rotations[quatBase + 2u], rotations[quatBase + 3u]);
  let scale = exp(scaleLog) * frame.splatScale;
  let axis0 = rotateAxis(rotation, vec3f(1.0, 0.0, 0.0)) * scale.x;
  let axis1 = rotateAxis(rotation, vec3f(0.0, 1.0, 0.0)) * scale.y;
  let axis2 = rotateAxis(rotation, vec3f(0.0, 0.0, 1.0)) * scale.z;

  // Normal: smallest-scale axis direction
  let len0 = dot(axis0, axis0);
  let len1 = dot(axis1, axis1);
  let len2 = dot(axis2, axis2);
  let minLen = min(len0, min(len1, len2));
  let normalAxis = select(select(axis2, axis1, len1 == minLen), axis0, len0 == minLen);
  let normal = normalize(normalAxis);

  // PlayCanvas-style Jacobian: focal/vz with separate view matrix.
  // focal = viewport * projMat[0][0] * 0.5 (the 0.5 corrects for the NDC range).
  let M = transpose(mat3x3f(axis0, axis1, axis2));

  let w0 = vec3f(frame.viewMatrix[0].x, frame.viewMatrix[1].x, frame.viewMatrix[2].x);
  let w1 = vec3f(frame.viewMatrix[0].y, frame.viewMatrix[1].y, frame.viewMatrix[2].y);
  let w2 = vec3f(frame.viewMatrix[0].z, frame.viewMatrix[1].z, frame.viewMatrix[2].z);

  let viewCenter = (frame.viewMatrix * vec4f(center, 1.0)).xyz;
  let vz = min(viewCenter.z, -0.001);

  let J1x = frame.focal.x / vz;
  let J1y = frame.focal.y / vz;
  let J2 = vec2f(-J1x, -J1y) / vz * viewCenter.xy;

  let tt0 = J1x * w0 + J2.x * w2;
  let tt1 = J1y * w1 + J2.y * w2;

  let b0 = M * tt0;
  let b1 = M * tt1;

  let covXXraw = dot(b0, b0);
  let covXY = dot(b0, b1);
  let covYYraw = dot(b1, b1);

  // AA opacity compensation: ratio of determinants before/after low-pass filter
  let detOrig = covXXraw * covYYraw - covXY * covXY;
  let covXX = covXXraw + COV_LOW_PASS;
  let covYY = covYYraw + COV_LOW_PASS;
  let detBlur = covXX * covYY - covXY * covXY;
  let aaFactor = sqrt(max(detOrig / max(detBlur, 0.000001), 0.0));

  let mid = 0.5 * (covXX + covYY);
  let det = max(detBlur, 0.1);
  let lambda = mid + sqrt(max(mid * mid - det, 0.1));
  let radius = ceil(COMPACT_FOOTPRINT_SIGMA_RADIUS * sqrt(lambda));

  // Invisible splat (degenerate projection)
  if (radius <= 0.0) {
    projCache[base + 7u] = 0xFFFFFFFFu;
    depthBuffer[sortRank] = 0xFFFFFFFFu;
    return;
  }

  let detInv = 1.0 / max(detBlur, 0.000001);
  let inverseCov2d = vec3f(covYY * detInv, -covXY * detInv, covXX * detInv);
  let sourceOpacity = clamp(opacities[splatId] * aaFactor, 0.0, 0.99);

  // Compute tile bounds, capped to MAX_TILE_SPAN per axis to prevent tile-ref
  // buffer overflow on close-up splats. The Gaussian is negligible beyond ~8
  // tiles (128px at 16px tiles) from center anyway.
  let tileSize = max(frame.tileSizePx, 1.0);
  let maxTile = max(frame.tileGrid, vec2u(1u)) - vec2u(1u);
  let clampedRadius = min(radius, tileSize * 8.0); // cap footprint to 8 tiles from center
  let minPx = max(centerPx - vec2f(clampedRadius), vec2f(0.0));
  let maxPx = min(centerPx + vec2f(clampedRadius), frame.viewport);
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
  projCache[base + 5u] = materialData[splatId]; // pack2x16float(roughness, metalness) — pass through
  projCache[base + 6u] = pack2x16float(vec2f(radius, sourceOpacity));
  depthBuffer[sortRank] = bitcast<u32>(depthNdc); // separate depth buffer for per-tile sort
  // Pack tile bounds as 4 bytes (supports up to 255 tiles per axis)
  let tileBoundsPacked = (minTileX & 0xFFu) | ((minTileY & 0xFFu) << 8u)
                        | ((maxTileX & 0xFFu) << 16u) | ((maxTileY & 0xFFu) << 24u);
  projCache[base + 7u] = tileBoundsPacked;

  // Per-splat normal: use baked normal data if available, else covariance-derived
  var splatNormal = normal; // covariance-derived default
  let normalBase = splatId * 3u;
  if (normalBase + 2u < arrayLength(&normalData)) {
    let baked = vec3f(normalData[normalBase], normalData[normalBase + 1u], normalData[normalBase + 2u]);
    let bakedLen = length(baked);
    if (bakedLen > 0.001) {
      splatNormal = baked / bakedLen;
    }
  }
  projCache[base + 8u] = pack2x16float(octEncode(splatNormal));

  // SH-evaluated view-dependent color
  let shCoeffCount = (frame.shDegree + 1u) * (frame.shDegree + 1u) - 1u;
  let shStride = shCoeffCount * 3u; // floats per splat excluding DC
  let shBase = splatId * (3u + shStride); // DC (3 floats) + SH coefficients
  // DC color (degree 0)
  var color = vec3f(shData[shBase], shData[shBase + 1u], shData[shBase + 2u]);

  if (frame.shDegree >= 1u) {
    // View direction: camera → splat center, normalized
    let viewDir = normalize(frame.cameraPos - center);
    let vx = viewDir.x;
    let vy = viewDir.y;
    let vz = viewDir.z;

    let b1 = shBase + 3u; // degree 1 starts after DC
    // Degree 1: Y_1^{-1}=y, Y_1^0=z, Y_1^1=x
    // SH layout: [c0_r, c0_g, c0_b, c1_r, c1_g, c1_b, ...]
    color += SH_C1 * vec3f(
      shData[b1 + 0u] * vy + shData[b1 + 3u] * vz + shData[b1 + 6u] * vx,
      shData[b1 + 1u] * vy + shData[b1 + 4u] * vz + shData[b1 + 7u] * vx,
      shData[b1 + 2u] * vy + shData[b1 + 5u] * vz + shData[b1 + 8u] * vx,
    );

    if (frame.shDegree >= 2u) {
      let xx = vx * vx; let yy = vy * vy; let zz = vz * vz;
      let xy = vx * vy; let yz = vy * vz; let xz = vx * vz;
      let b2_0 = SH_C2_0 * xy;
      let b2_1 = SH_C2_1 * yz;
      let b2_2 = SH_C2_2 * (2.0 * zz - xx - yy);
      let b2_3 = SH_C2_3 * xz;
      let b2_4 = SH_C2_4 * (xx - yy);
      let b2 = b1 + 9u; // degree 2 starts after degree 1 (3 basis × 3 components)
      color += vec3f(
        shData[b2 +  0u] * b2_0 + shData[b2 +  3u] * b2_1 + shData[b2 +  6u] * b2_2 + shData[b2 +  9u] * b2_3 + shData[b2 + 12u] * b2_4,
        shData[b2 +  1u] * b2_0 + shData[b2 +  4u] * b2_1 + shData[b2 +  7u] * b2_2 + shData[b2 + 10u] * b2_3 + shData[b2 + 13u] * b2_4,
        shData[b2 +  2u] * b2_0 + shData[b2 +  5u] * b2_1 + shData[b2 +  8u] * b2_2 + shData[b2 + 11u] * b2_3 + shData[b2 + 14u] * b2_4,
      );

      if (frame.shDegree >= 3u) {
        let b3_0 = SH_C3_0 * vy * (3.0 * xx - yy);
        let b3_1 = SH_C3_1 * vx * vy * vz;
        let b3_2 = SH_C3_2 * vy * (4.0 * zz - xx - yy);
        let b3_3 = SH_C3_3 * vz * (2.0 * zz - 3.0 * xx - 3.0 * yy);
        let b3_4 = SH_C3_4 * vx * (4.0 * zz - xx - yy);
        let b3_5 = SH_C3_5 * vz * (xx - yy);
        let b3_6 = SH_C3_6 * vx * (xx - 3.0 * yy);
        let b3 = b2 + 15u; // degree 3 starts after degree 2 (5 basis × 3 components)
        color += vec3f(
          shData[b3 +  0u] * b3_0 + shData[b3 +  3u] * b3_1 + shData[b3 +  6u] * b3_2 + shData[b3 +  9u] * b3_3 + shData[b3 + 12u] * b3_4 + shData[b3 + 15u] * b3_5 + shData[b3 + 18u] * b3_6,
          shData[b3 +  1u] * b3_0 + shData[b3 +  4u] * b3_1 + shData[b3 +  7u] * b3_2 + shData[b3 + 10u] * b3_3 + shData[b3 + 13u] * b3_4 + shData[b3 + 16u] * b3_5 + shData[b3 + 19u] * b3_6,
          shData[b3 +  2u] * b3_0 + shData[b3 +  5u] * b3_1 + shData[b3 +  8u] * b3_2 + shData[b3 + 11u] * b3_3 + shData[b3 + 14u] * b3_4 + shData[b3 + 17u] * b3_5 + shData[b3 + 20u] * b3_6,
        );
      }
    }
  }

  color = clamp(color, vec3f(0.0), vec3f(1.0));
  projCache[base + 9u] = pack2x16float(color.rg);
  projCache[base + 10u] = pack2x16float(vec2f(color.b, 0.0));
}
