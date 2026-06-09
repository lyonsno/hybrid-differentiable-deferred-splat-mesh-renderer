struct AlphaDensityFrameUniforms {
  viewProj: mat4x4f,
  viewport: vec2f,
  tileGrid: vec2u,
  splatCount: u32,
  tileSizePx: f32,
  alphaMassCap: f32,
  fixedPointScale: f32,
};

@group(0) @binding(0) var<uniform> frame: AlphaDensityFrameUniforms;
@group(0) @binding(1) var<storage, read> positions: array<f32>;
@group(0) @binding(2) var<storage, read> opacities: array<f32>;
@group(0) @binding(3) var<storage, read_write> tileAlphaMass: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> compensatedOpacities: array<f32>;

const MIN_ALPHA_DENSITY_OPACITY_FRACTION = 0.5;

fn alpha_density_tile_count() -> u32 {
  return max(frame.tileGrid.x * frame.tileGrid.y, 1u);
}

fn projected_center_px(splatId: u32) -> vec2f {
  let positionBase = splatId * 3u;
  let center = vec3f(positions[positionBase], positions[positionBase + 1u], positions[positionBase + 2u]);
  let centerClip = frame.viewProj * vec4f(center, 1.0);
  let centerNdc = centerClip.xy / max(centerClip.w, 0.000001);
  return vec2f(
    (centerNdc.x * 0.5 + 0.5) * frame.viewport.x,
    (1.0 - (centerNdc.y * 0.5 + 0.5)) * frame.viewport.y,
  );
}

fn alpha_density_center_tile_id(splatId: u32) -> u32 {
  let centerPx = projected_center_px(splatId);
  let tileSizePx = max(frame.tileSizePx, 1.0);
  let maxTile = max(frame.tileGrid, vec2u(1u, 1u)) - vec2u(1u, 1u);
  let tileX = min(u32(floor(max(centerPx.x, 0.0) / tileSizePx)), maxTile.x);
  let tileY = min(u32(floor(max(centerPx.y, 0.0) / tileSizePx)), maxTile.y);
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

  let tileId = alpha_density_center_tile_id(splatId);
  let rawOpacity = clamp(opacities[splatId], 0.0, 1.0);
  let conservativeFootprintMass = frame.tileSizePx * frame.tileSizePx * rawOpacity;
  atomicAdd(&tileAlphaMass[tileId], fixed_point_alpha_mass(conservativeFootprintMass));
}

@compute @workgroup_size(64)
fn write_compensated_opacity(@builtin(global_invocation_id) globalId: vec3u) {
  let splatId = globalId.x;
  if (splatId >= frame.splatCount) {
    return;
  }

  let rawOpacity = clamp(opacities[splatId], 0.0, 1.0);
  let tileId = alpha_density_center_tile_id(splatId);
  let tileAlphaMass = f32(atomicLoad(&tileAlphaMass[tileId])) / max(frame.fixedPointScale, 1.0);
  var exponent = 1.0;
  if (tileAlphaMass > frame.alphaMassCap) {
    exponent = clamp(frame.alphaMassCap / max(tileAlphaMass, 0.000001), 0.0, 1.0);
  }

  let opacityFloor = rawOpacity * MIN_ALPHA_DENSITY_OPACITY_FRACTION;
  compensatedOpacities[splatId] = max(compensate_alpha_optical_depth(rawOpacity, exponent), opacityFloor);
}
