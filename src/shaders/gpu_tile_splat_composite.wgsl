// Per-pixel Gaussian splat compositor matching reference 3DGS.
// Uses the viewProj-based Jacobian (handles WebGPU Y-flip correctly).
// No splatScale fudge factor — the Jacobian + viewport/2 gives pixel-space directly.
// Low-pass filter +0.3 on 2D covariance diagonal (reference anti-aliasing).
// Gaussian falloff: exp(-0.5 * mahalanobis^2) (standard normalized Gaussian).

struct FrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileSizePx: f32,
  debugMode: f32,
  tileGrid: vec2u,
  splatCount: u32,
  totalTileRefs: u32,
};

const TRANSMITTANCE_CUTOFF = 0.001;
const COMPACT_FOOTPRINT_SIGMA_RADIUS = 3.0;
const COMPACT_FOOTPRINT_EPSILON = 0.000000001;
const MIN_SPLAT_CLIP_W = 0.0001;
const COV_LOW_PASS = 0.3;

@group(0) @binding(0) var<uniform> frame: FrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> colors: array<f32>;
@group(0) @binding(3) var<storage, read> scales: array<f32>;
@group(0) @binding(4) var<storage, read> rotations: array<f32>;
@group(0) @binding(5) var<storage, read> opacities: array<f32>;
@group(0) @binding(6) var<storage, read> sortedIndices: array<u32>;

@group(1) @binding(0) var<storage, read_write> tileCounts: array<atomic<u32>>;
@group(1) @binding(1) var<storage, read_write> tileOffsets: array<u32>;
@group(1) @binding(2) var<storage, read_write> tileRefs: array<u32>;
@group(1) @binding(3) var outputColor: texture_storage_2d<rgba16float, write>;

const TILE_REF_STRIDE = 8u;

// --- Projection ---

struct SplatShape {
  axis0: vec3f,
  axis1: vec3f,
  axis2: vec3f,
};

struct ProjectedSplat {
  centerPx: vec2f,
  inverseCov2d: vec3f,  // inverse of 2D covariance: [xx, xy, yy]
  radius: f32,           // screen-space radius (3 sigma)
  depthNdc: f32,
  opacity: f32,
};

fn rotateAxis(rotation: vec4f, axis: vec3f) -> vec3f {
  let q = rotation / max(length(rotation), 0.000001);
  let u = vec3f(q.y, q.z, q.w);
  return axis + 2.0 * cross(u, cross(u, axis) + q.x * axis);
}

fn makeSplatShape(scaleLog: vec3f, rotation: vec4f) -> SplatShape {
  let scale = exp(scaleLog);
  return SplatShape(
    rotateAxis(rotation, vec3f(1.0, 0.0, 0.0)) * scale.x,
    rotateAxis(rotation, vec3f(0.0, 1.0, 0.0)) * scale.y,
    rotateAxis(rotation, vec3f(0.0, 0.0, 1.0)) * scale.z,
  );
}

fn viewProjectionLinearRow(row: u32) -> vec3f {
  return vec3f(frame.viewProj[0][row], frame.viewProj[1][row], frame.viewProj[2][row]);
}

// Jacobian of (clip.xy / clip.w) with respect to world position, projected onto axis.
// Returns NDC-space displacement. Multiply by viewport/2 to get pixels.
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

fn projectSplat(splatId: u32) -> ProjectedSplat {
  let posBase = splatId * 3u;
  let center = vec3f(positions[posBase], positions[posBase + 1u], positions[posBase + 2u]);
  let centerClip = frame.viewProj * vec4f(center, 1.0);

  let safeW = max(centerClip.w, MIN_SPLAT_CLIP_W);
  let centerNdc = centerClip.xy / safeW;
  let centerPx = vec2f(
    (centerNdc.x * 0.5 + 0.5) * frame.viewport.x,
    (1.0 - (centerNdc.y * 0.5 + 0.5)) * frame.viewport.y,
  );
  let depthNdc = centerClip.z / safeW;

  let vecBase = splatId * 3u;
  let quatBase = splatId * 4u;
  let shape = makeSplatShape(
    vec3f(scales[vecBase], scales[vecBase + 1u], scales[vecBase + 2u]),
    vec4f(rotations[quatBase], rotations[quatBase + 1u], rotations[quatBase + 2u], rotations[quatBase + 3u]),
  );

  // Project 3D shape axes to 2D pixel space via Jacobian
  // NDC -> pixels: multiply by viewport/2 (no splatScale factor)
  let viewportScale = vec2f(frame.viewport.x, frame.viewport.y) * 0.5;
  let axis0 = projectAxisJacobian(shape.axis0, centerClip) * viewportScale;
  let axis1 = projectAxisJacobian(shape.axis1, centerClip) * viewportScale;
  let axis2 = projectAxisJacobian(shape.axis2, centerClip) * viewportScale;

  // 2D covariance in pixel space (no extra scale factor — matches CUDA reference)
  let covXX = axis0.x * axis0.x + axis1.x * axis1.x + axis2.x * axis2.x + COV_LOW_PASS;
  let covXY = axis0.x * axis0.y + axis1.x * axis1.y + axis2.x * axis2.y;
  let covYY = axis0.y * axis0.y + axis1.y * axis1.y + axis2.y * axis2.y + COV_LOW_PASS;

  // Eigenvalues for screen radius
  let mid = 0.5 * (covXX + covYY);
  let det = max(covXX * covYY - covXY * covXY, 0.1);
  let lambda = mid + sqrt(max(mid * mid - det, 0.1));
  let radius = ceil(COMPACT_FOOTPRINT_SIGMA_RADIUS * sqrt(lambda));

  // Invert 2x2 covariance for Gaussian evaluation
  let detFull = max(covXX * covYY - covXY * covXY, 0.000001);
  let detInv = 1.0 / detFull;
  let inverseCov2d = vec3f(covYY * detInv, -covXY * detInv, covXX * detInv);

  let sourceOpacity = clamp(opacities[splatId], 0.0, 0.99);

  return ProjectedSplat(centerPx, inverseCov2d, radius, depthNdc, sourceOpacity);
}

fn footprintBounds(centerPx: vec2f, radius: f32) -> vec4u {
  let tileSize = max(frame.tileSizePx, 1.0);
  let maxTile = max(frame.tileGrid, vec2u(1u)) - vec2u(1u);
  let minPx = max(centerPx - vec2f(radius), vec2f(0.0));
  let maxPx = min(centerPx + vec2f(radius), frame.viewport);
  return vec4u(
    min(u32(floor(minPx.x / tileSize)), maxTile.x),
    min(u32(floor(minPx.y / tileSize)), maxTile.y),
    min(u32(floor(max((maxPx.x - COMPACT_FOOTPRINT_EPSILON) / tileSize, 0.0))), maxTile.x),
    min(u32(floor(max((maxPx.y - COMPACT_FOOTPRINT_EPSILON) / tileSize, 0.0))), maxTile.y),
  );
}

// --- Pass 1: Count ---
@compute @workgroup_size(256)
fn count_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let sortRank = globalId.x;
  if (sortRank >= frame.splatCount) { return; }
  let splatId = sortedIndices[sortRank];
  if (splatId >= frame.splatCount) { return; }

  let posBase = splatId * 3u;
  let centerClip = frame.viewProj * vec4f(
    positions[posBase], positions[posBase + 1u], positions[posBase + 2u], 1.0
  );
  if (centerClip.w <= 0.0) { return; }

  let splat = projectSplat(splatId);
  if (splat.radius <= 0.0) { return; }
  let bounds = footprintBounds(splat.centerPx, splat.radius);

  for (var tileY = bounds.y; tileY <= bounds.w; tileY++) {
    for (var tileX = bounds.x; tileX <= bounds.z; tileX++) {
      let tileId = tileY * frame.tileGrid.x + tileX;
      atomicAdd(&tileCounts[tileId], 1u);
    }
  }
}

// --- Pass 3: Scatter ---
@compute @workgroup_size(256)
fn scatter_tile_refs(@builtin(global_invocation_id) globalId: vec3u) {
  let sortRank = globalId.x;
  if (sortRank >= frame.splatCount) { return; }
  let splatId = sortedIndices[sortRank];
  if (splatId >= frame.splatCount) { return; }

  let posBase = splatId * 3u;
  let centerClip = frame.viewProj * vec4f(
    positions[posBase], positions[posBase + 1u], positions[posBase + 2u], 1.0
  );
  if (centerClip.w <= 0.0) { return; }

  let splat = projectSplat(splatId);
  if (splat.radius <= 0.0) { return; }
  let bounds = footprintBounds(splat.centerPx, splat.radius);

  for (var tileY = bounds.y; tileY <= bounds.w; tileY++) {
    for (var tileX = bounds.x; tileX <= bounds.z; tileX++) {
      let tileId = tileY * frame.tileGrid.x + tileX;
      let slot = atomicAdd(&tileCounts[tileId], 1u);
      let baseOffset = tileOffsets[tileId];
      let refIdx = (baseOffset + slot) * TILE_REF_STRIDE;
      if (refIdx + TILE_REF_STRIDE <= frame.totalTileRefs * TILE_REF_STRIDE) {
        tileRefs[refIdx + 0u] = splatId;
        tileRefs[refIdx + 1u] = bitcast<u32>(splat.depthNdc);
        tileRefs[refIdx + 2u] = bitcast<u32>(splat.centerPx.x);
        tileRefs[refIdx + 3u] = bitcast<u32>(splat.centerPx.y);
        tileRefs[refIdx + 4u] = bitcast<u32>(splat.inverseCov2d.x);
        tileRefs[refIdx + 5u] = bitcast<u32>(splat.inverseCov2d.y);
        tileRefs[refIdx + 6u] = bitcast<u32>(splat.inverseCov2d.z);
        tileRefs[refIdx + 7u] = bitcast<u32>(splat.opacity);
      }
    }
  }
}

// --- Pass 4: Composite (back-to-front source-over) ---
@compute @workgroup_size(8, 8, 1)
fn composite(@builtin(global_invocation_id) globalId: vec3u) {
  let outputSize = textureDimensions(outputColor);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) { return; }

  let tileSizePx = max(u32(frame.tileSizePx), 1u);
  let tileX = min(globalId.x / tileSizePx, frame.tileGrid.x - 1u);
  let tileY = min(globalId.y / tileSizePx, frame.tileGrid.y - 1u);
  let tileId = tileY * frame.tileGrid.x + tileX;
  let pixelCenter = vec2f(f32(globalId.x) + 0.5, f32(globalId.y) + 0.5);

  let refStart = tileOffsets[tileId];
  let refCount = atomicLoad(&tileCounts[tileId]);

  // Back-to-front compositing (refs scattered in back-to-front order from descending sort)
  var composedColor = vec3f(0.02, 0.02, 0.04);

  for (var i = 0u; i < refCount; i++) {
    let refIdx = (refStart + i) * TILE_REF_STRIDE;
    if (refIdx + TILE_REF_STRIDE > frame.totalTileRefs * TILE_REF_STRIDE) { break; }

    let splatId = tileRefs[refIdx + 0u];
    if (splatId >= frame.splatCount) { continue; }

    let centerPx = vec2f(
      bitcast<f32>(tileRefs[refIdx + 2u]),
      bitcast<f32>(tileRefs[refIdx + 3u]),
    );
    let con = vec3f(
      bitcast<f32>(tileRefs[refIdx + 4u]),
      bitcast<f32>(tileRefs[refIdx + 5u]),
      bitcast<f32>(tileRefs[refIdx + 6u]),
    );
    let opacity = bitcast<f32>(tileRefs[refIdx + 7u]);

    // Reference 3DGS Gaussian: power = -0.5 * (con.x*dx*dx + con.z*dy*dy) - con.y*dx*dy
    let d = pixelCenter - centerPx;
    let power = -0.5 * (con.x * d.x * d.x + con.z * d.y * d.y) - con.y * d.x * d.y;
    if (power > 0.0) { continue; }

    let alpha = min(opacity * exp(power), 0.99);
    if (alpha < 1.0 / 255.0) { continue; }

    let colorBase = splatId * 3u;
    let sourceColor = vec3f(colors[colorBase], colors[colorBase + 1u], colors[colorBase + 2u]);

    composedColor = sourceColor * alpha + composedColor * (1.0 - alpha);
  }

  textureStore(outputColor, vec2i(globalId.xy), vec4f(composedColor, 1.0));
}
