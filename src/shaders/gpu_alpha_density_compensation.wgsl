struct AlphaDensityFrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileGrid: vec2u,
  splatCount: u32,
  tileSizePx: f32,
  alphaMassCap: f32,
  fixedPointScale: f32,
  splatScale: f32,
  minRadiusPx: f32,
};

@group(0) @binding(0) var<uniform> frame: AlphaDensityFrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> opacities: array<f32>;
@group(0) @binding(3) var<storage, read> scales: array<f32>;
@group(0) @binding(4) var<storage, read> rotations: array<f32>;
@group(0) @binding(5) var<storage, read_write> tileAlphaMass: array<atomic<u32>>;
@group(0) @binding(6) var<storage, read_write> compensatedOpacities: array<f32>;

const MIN_ALPHA_DENSITY_OPACITY_FRACTION = 0.5;
const MIN_SPLAT_CLIP_W = 0.0001;
const MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION = 4.0;
const MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION = 0.015625;
const COMPACT_FOOTPRINT_SIGMA_RADIUS = 3.0;
const COMPACT_FOOTPRINT_EPSILON = 0.000000001;

struct SplatShape {
  axis0: vec3f,
  axis1: vec3f,
  axis2: vec3f,
};

struct AlphaDensityProjectedSupport {
  centerPx: vec2f,
  inverseConic: vec3f,
  majorRadiusPx: f32,
  minorRadiusPx: f32,
};

fn alpha_density_tile_count() -> u32 {
  return max(frame.tileGrid.x * frame.tileGrid.y, 1u);
}

fn projected_center_clip(splatId: u32) -> vec4f {
  let positionBase = splatId * 3u;
  let center = vec3f(positions[positionBase], positions[positionBase + 1u], positions[positionBase + 2u]);
  return frame.viewProj * vec4f(center, 1.0);
}

fn rotate_axis(rotation: vec4f, axis: vec3f) -> vec3f {
  let q = rotation / max(length(rotation), 0.000001);
  let u = vec3f(q.y, q.z, q.w);
  return axis + 2.0 * cross(u, cross(u, axis) + q.x * axis);
}

fn make_splat_shape(scaleLog: vec3f, rotation: vec4f) -> SplatShape {
  let scale = exp(scaleLog);
  return SplatShape(
    rotate_axis(rotation, vec3f(1.0, 0.0, 0.0)) * scale.x,
    rotate_axis(rotation, vec3f(0.0, 1.0, 0.0)) * scale.y,
    rotate_axis(rotation, vec3f(0.0, 0.0, 1.0)) * scale.z,
  );
}

fn view_projection_linear_row(row: u32) -> vec3f {
  return vec3f(frame.viewProj[0][row], frame.viewProj[1][row], frame.viewProj[2][row]);
}

fn project_axis_jacobian(axis: vec3f, centerClip: vec4f) -> vec2f {
  let viewProjRow0 = view_projection_linear_row(0u);
  let viewProjRow1 = view_projection_linear_row(1u);
  let viewProjRow3 = view_projection_linear_row(3u);
  let safeW = max(abs(centerClip.w), MIN_SPLAT_CLIP_W);
  let clipW2 = safeW * safeW;
  let viewJacobianX = (centerClip.w * viewProjRow0 - centerClip.x * viewProjRow3) / clipW2;
  let viewJacobianY = (centerClip.w * viewProjRow1 - centerClip.y * viewProjRow3) / clipW2;
  return vec2f(dot(viewJacobianX, axis), dot(viewJacobianY, axis));
}

fn bounded_minor_radius_px(rawMajorRadiusPx: f32, rawMinorRadiusPx: f32, minRadiusPx: f32) -> f32 {
  if (rawMinorRadiusPx >= minRadiusPx) {
    return rawMinorRadiusPx;
  }
  if (rawMajorRadiusPx < minRadiusPx) {
    return minRadiusPx;
  }
  let inflatedMinor = max(
    rawMinorRadiusPx * MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION,
    minRadiusPx * MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION,
  );
  return min(minRadiusPx, inflatedMinor);
}

fn footprint_policy_scale(majorRadiusPx: f32, minorRadiusPx: f32) -> f32 {
  let areaCapPx = frame.viewport.x * frame.viewport.y * 0.01;
  let majorRadiusCapPx = max(min(frame.viewport.x, frame.viewport.y) * 0.65, frame.minRadiusPx);
  let footprintAreaPx = 3.14159265 * majorRadiusPx * minorRadiusPx;
  let areaScale = sqrt(areaCapPx / max(footprintAreaPx, areaCapPx));
  let majorScale = majorRadiusCapPx / max(majorRadiusPx, majorRadiusCapPx);
  return min(min(areaScale, majorScale), 1.0);
}

fn alpha_density_projected_support(splatId: u32) -> AlphaDensityProjectedSupport {
  let centerClip = projected_center_clip(splatId);
  let centerNdc = centerClip.xy / max(centerClip.w, 0.000001);
  let centerPx = vec2f(
    (centerNdc.x * 0.5 + 0.5) * frame.viewport.x,
    (1.0 - (centerNdc.y * 0.5 + 0.5)) * frame.viewport.y,
  );
  let vecBase = splatId * 3u;
  let quatBase = splatId * 4u;
  let shape = make_splat_shape(
    vec3f(scales[vecBase], scales[vecBase + 1u], scales[vecBase + 2u]),
    vec4f(rotations[quatBase], rotations[quatBase + 1u], rotations[quatBase + 2u], rotations[quatBase + 3u]),
  );
  let viewportScale = vec2f(frame.viewport.x, frame.viewport.y) * 0.5 * (frame.splatScale / 600.0);
  let axis0 = project_axis_jacobian(shape.axis0, centerClip) * viewportScale;
  let axis1 = project_axis_jacobian(shape.axis1, centerClip) * viewportScale;
  let axis2 = project_axis_jacobian(shape.axis2, centerClip) * viewportScale;
  let covXX = axis0.x * axis0.x + axis1.x * axis1.x + axis2.x * axis2.x;
  let covXY = axis0.x * axis0.y + axis1.x * axis1.y + axis2.x * axis2.y;
  let covYY = axis0.y * axis0.y + axis1.y * axis1.y + axis2.y * axis2.y;
  let trace = 0.5 * (covXX + covYY);
  let diff = 0.5 * (covXX - covYY);
  let root = sqrt(max(diff * diff + covXY * covXY, 0.0));
  let lambda0 = max(trace + root, 0.0);
  let lambda1 = max(trace - root, 0.0);
  var majorDir = vec2f(1.0, 0.0);
  if (abs(covXY) + abs(lambda0 - covXX) > 0.00000001) {
    majorDir = normalize(vec2f(covXY, lambda0 - covXX));
  } else if (covYY > covXX) {
    majorDir = vec2f(0.0, 1.0);
  }
  let minorDir = vec2f(-majorDir.y, majorDir.x);
  let rawMajorRadiusPx = sqrt(lambda0);
  let rawMinorRadiusPx = sqrt(lambda1);
  let minRadiusPx = max(frame.minRadiusPx, 0.0);
  let uncappedMajorRadiusPx = max(rawMajorRadiusPx, minRadiusPx);
  let uncappedMinorRadiusPx = bounded_minor_radius_px(rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx);
  let footprintScale = footprint_policy_scale(uncappedMajorRadiusPx, uncappedMinorRadiusPx);
  let scaledMinorRadiusPx = max(uncappedMinorRadiusPx * footprintScale, minRadiusPx);
  let majorRadiusPx = max(uncappedMajorRadiusPx * footprintScale, scaledMinorRadiusPx);
  let minorRadiusPx = scaledMinorRadiusPx;
  let majorInvVar = 1.0 / max(majorRadiusPx * majorRadiusPx, 0.000001);
  let minorInvVar = 1.0 / max(minorRadiusPx * minorRadiusPx, 0.000001);
  let inverseXX = majorDir.x * majorDir.x * majorInvVar + minorDir.x * minorDir.x * minorInvVar;
  let inverseXY = majorDir.x * majorDir.y * majorInvVar + minorDir.x * minorDir.y * minorInvVar;
  let inverseYY = majorDir.y * majorDir.y * majorInvVar + minorDir.y * minorDir.y * minorInvVar;
  return AlphaDensityProjectedSupport(centerPx, vec3f(inverseXX, inverseXY, inverseYY), majorRadiusPx, minorRadiusPx);
}

fn alpha_density_tile_bounds_for_splat(support: AlphaDensityProjectedSupport) -> vec4u {
  let inverseConic = support.inverseConic;
  let determinant = max(inverseConic.x * inverseConic.z - inverseConic.y * inverseConic.y, COMPACT_FOOTPRINT_EPSILON);
  let covarianceXx = max(inverseConic.z / determinant, 0.0);
  let covarianceYy = max(inverseConic.x / determinant, 0.0);
  let radius = vec2f(
    COMPACT_FOOTPRINT_SIGMA_RADIUS * sqrt(covarianceXx),
    COMPACT_FOOTPRINT_SIGMA_RADIUS * sqrt(covarianceYy),
  );
  let viewportMax = max(frame.viewport, vec2f(0.0, 0.0));
  let minCenterPx = clamp(support.centerPx - radius, vec2f(0.0, 0.0), viewportMax);
  let maxCenterPx = clamp(support.centerPx + radius, vec2f(0.0, 0.0), viewportMax);
  let tileSizePx = max(frame.tileSizePx, 1.0);
  let maxTile = max(frame.tileGrid, vec2u(1u, 1u)) - vec2u(1u, 1u);
  let minTileX = min(u32(floor(minCenterPx.x / tileSizePx)), maxTile.x);
  let minTileY = min(u32(floor(minCenterPx.y / tileSizePx)), maxTile.y);
  let maxTileX = min(u32(floor(max((maxCenterPx.x - COMPACT_FOOTPRINT_EPSILON) / tileSizePx, 0.0))), maxTile.x);
  let maxTileY = min(u32(floor(max((maxCenterPx.y - COMPACT_FOOTPRINT_EPSILON) / tileSizePx, 0.0))), maxTile.y);
  return vec4u(minTileX, minTileY, maxTileX, maxTileY);
}

fn alpha_density_tile_center_px(tileX: u32, tileY: u32) -> vec2f {
  let tileSize = max(frame.tileSizePx, 1.0);
  return vec2f((f32(tileX) + 0.5) * tileSize, (f32(tileY) + 0.5) * tileSize);
}

fn alpha_density_tile_coverage_weight(support: AlphaDensityProjectedSupport, tileCenterPx: vec2f) -> f32 {
  let delta = tileCenterPx - support.centerPx;
  let tileMahalanobis2 = support.inverseConic.x * delta.x * delta.x
    + 2.0 * support.inverseConic.y * delta.x * delta.y
    + support.inverseConic.z * delta.y * delta.y;
  return exp(-0.5 * tileMahalanobis2);
}

fn alpha_density_tile_id(tileX: u32, tileY: u32) -> u32 {
  return min(tileY * max(frame.tileGrid.x, 1u) + tileX, alpha_density_tile_count() - 1u);
}

fn fixed_point_alpha_mass(alphaMass: f32) -> u32 {
  return u32(round(clamp(alphaMass, 0.0, 16777215.0) * max(frame.fixedPointScale, 1.0)));
}

fn compensate_alpha_optical_depth(rawOpacity: f32, exponent: f32) -> f32 {
  let baseTransmittance = max(1.0 - clamp(rawOpacity, 0.0, 1.0), 0.000001);
  return clamp(1.0 - pow(baseTransmittance, clamp(exponent, 0.0, 1.0)), 0.0, 1.0);
}

@compute @workgroup_size(64)
fn clear_alpha_density_tile_mass(@builtin(global_invocation_id) globalId: vec3u) {
  let tileId = globalId.x;
  if (tileId >= alpha_density_tile_count()) {
    return;
  }
  atomicStore(&tileAlphaMass[tileId], 0u);
}

@compute @workgroup_size(64)
fn scatter_alpha_density_tile_mass(@builtin(global_invocation_id) globalId: vec3u) {
  let splatId = globalId.x;
  if (splatId >= frame.splatCount) {
    return;
  }

  let support = alpha_density_projected_support(splatId);
  let bounds = alpha_density_tile_bounds_for_splat(support);
  let rawOpacity = clamp(opacities[splatId], 0.0, 1.0);
  let footprintMass = 3.14159265 * support.majorRadiusPx * support.minorRadiusPx * rawOpacity;
  for (var tileY = bounds.y; tileY <= bounds.w; tileY = tileY + 1u) {
    for (var tileX = bounds.x; tileX <= bounds.z; tileX = tileX + 1u) {
      let coverageWeight = alpha_density_tile_coverage_weight(support, alpha_density_tile_center_px(tileX, tileY));
      if (coverageWeight > 0.000001) {
        atomicAdd(&tileAlphaMass[alpha_density_tile_id(tileX, tileY)], fixed_point_alpha_mass(footprintMass * coverageWeight));
      }
    }
  }
}

@compute @workgroup_size(64)
fn write_compensated_opacity(@builtin(global_invocation_id) globalId: vec3u) {
  let splatId = globalId.x;
  if (splatId >= frame.splatCount) {
    return;
  }

  let rawOpacity = clamp(opacities[splatId], 0.0, 1.0);
  let support = alpha_density_projected_support(splatId);
  let bounds = alpha_density_tile_bounds_for_splat(support);
  var exponent = 1.0;
  for (var tileY = bounds.y; tileY <= bounds.w; tileY = tileY + 1u) {
    for (var tileX = bounds.x; tileX <= bounds.z; tileX = tileX + 1u) {
      let tileAlphaMass = f32(atomicLoad(&tileAlphaMass[alpha_density_tile_id(tileX, tileY)])) / max(frame.fixedPointScale, 1.0);
      if (tileAlphaMass > frame.alphaMassCap) {
        exponent = min(exponent, clamp(frame.alphaMassCap / max(tileAlphaMass, 0.000001), 0.0, 1.0));
      }
    }
  }

  let opacityFloor = rawOpacity * MIN_ALPHA_DENSITY_OPACITY_FRACTION;
  compensatedOpacities[splatId] = max(compensate_alpha_optical_depth(rawOpacity, exponent), opacityFloor);
}
