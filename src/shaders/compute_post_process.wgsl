@group(0) @binding(0) var postProcessInput: texture_2d<f32>;
@group(0) @binding(1) var postProcessOutput: texture_storage_2d<rgba16float, write>;

struct PostProcessSettings {
  enabled: u32,
  fxaaEnabled: u32,
  casEnabled: u32,
  sampleRadius: u32,
  sampleCount: u32,
  debugView: u32,
  casSharpness: f32,
  _pad0: u32,
};

@group(0) @binding(2) var<uniform> settings: PostProcessSettings;

const FXAA_EDGE_THRESHOLD = 0.0312;
const FXAA_EDGE_THRESHOLD_MIN = 0.00625;
const DEBUG_VIEW_FINAL = 0u;
const DEBUG_VIEW_FXAA_MASK = 1u;
const DEBUG_VIEW_CAS_MASK = 2u;
const DEBUG_VIEW_DIFFERENCE = 3u;

fn luma(color: vec3f) -> f32 {
  return dot(color, vec3f(0.299, 0.587, 0.114));
}

fn clamp_coord(coord: vec2i, size: vec2u) -> vec2i {
  let maxCoord = vec2i(i32(size.x) - 1, i32(size.y) - 1);
  return clamp(coord, vec2i(0), maxCoord);
}

fn load_rgb(coord: vec2i, size: vec2u) -> vec3f {
  return textureLoad(postProcessInput, clamp_coord(coord, size), 0).rgb;
}

fn configured_radius() -> i32 {
  return i32(clamp(settings.sampleRadius, 1u, 4u));
}

fn configured_sample_count() -> u32 {
  return clamp(settings.sampleCount, 4u, 12u);
}

fn ramp(edge0: f32, edge1: f32, value: f32) -> f32 {
  return clamp((value - edge0) / max(edge1 - edge0, 0.0001), 0.0, 1.0);
}

fn neighborhood_average(coord: vec2i, size: vec2u) -> vec3f {
  let radius = configured_radius();
  let sampleCount = configured_sample_count();
  let north = load_rgb(coord + vec2i(0, -radius), size);
  let south = load_rgb(coord + vec2i(0, radius), size);
  let west = load_rgb(coord + vec2i(-radius, 0), size);
  let east = load_rgb(coord + vec2i(radius, 0), size);
  var sum = north + south + west + east;
  var count = 4.0;

  if (sampleCount >= 8u) {
    sum += load_rgb(coord + vec2i(-radius, -radius), size);
    sum += load_rgb(coord + vec2i(radius, -radius), size);
    sum += load_rgb(coord + vec2i(-radius, radius), size);
    sum += load_rgb(coord + vec2i(radius, radius), size);
    count += 4.0;
  }

  if (sampleCount >= 12u) {
    let nearRadius = max(1, radius / 2);
    sum += load_rgb(coord + vec2i(0, -nearRadius), size);
    sum += load_rgb(coord + vec2i(0, nearRadius), size);
    sum += load_rgb(coord + vec2i(-nearRadius, 0), size);
    sum += load_rgb(coord + vec2i(nearRadius, 0), size);
    count += 4.0;
  }

  return sum / count;
}

fn local_min_rgb(coord: vec2i, size: vec2u, color: vec3f) -> vec3f {
  let radius = configured_radius();
  let sampleCount = configured_sample_count();
  var localMin = color;
  localMin = min(localMin, load_rgb(coord + vec2i(0, -radius), size));
  localMin = min(localMin, load_rgb(coord + vec2i(0, radius), size));
  localMin = min(localMin, load_rgb(coord + vec2i(-radius, 0), size));
  localMin = min(localMin, load_rgb(coord + vec2i(radius, 0), size));

  if (sampleCount >= 8u) {
    localMin = min(localMin, load_rgb(coord + vec2i(-radius, -radius), size));
    localMin = min(localMin, load_rgb(coord + vec2i(radius, -radius), size));
    localMin = min(localMin, load_rgb(coord + vec2i(-radius, radius), size));
    localMin = min(localMin, load_rgb(coord + vec2i(radius, radius), size));
  }

  return localMin;
}

fn local_max_rgb(coord: vec2i, size: vec2u, color: vec3f) -> vec3f {
  let radius = configured_radius();
  let sampleCount = configured_sample_count();
  var localMax = color;
  localMax = max(localMax, load_rgb(coord + vec2i(0, -radius), size));
  localMax = max(localMax, load_rgb(coord + vec2i(0, radius), size));
  localMax = max(localMax, load_rgb(coord + vec2i(-radius, 0), size));
  localMax = max(localMax, load_rgb(coord + vec2i(radius, 0), size));

  if (sampleCount >= 8u) {
    localMax = max(localMax, load_rgb(coord + vec2i(-radius, -radius), size));
    localMax = max(localMax, load_rgb(coord + vec2i(radius, -radius), size));
    localMax = max(localMax, load_rgb(coord + vec2i(-radius, radius), size));
    localMax = max(localMax, load_rgb(coord + vec2i(radius, radius), size));
  }

  return localMax;
}

fn local_luma_range(coord: vec2i, size: vec2u, color: vec3f) -> vec2f {
  let radius = configured_radius();
  let sampleCount = configured_sample_count();
  let centerLuma = luma(color);
  var minLuma = centerLuma;
  var maxLuma = centerLuma;

  let northLuma = luma(load_rgb(coord + vec2i(0, -radius), size));
  let southLuma = luma(load_rgb(coord + vec2i(0, radius), size));
  let westLuma = luma(load_rgb(coord + vec2i(-radius, 0), size));
  let eastLuma = luma(load_rgb(coord + vec2i(radius, 0), size));
  minLuma = min(minLuma, min(min(northLuma, southLuma), min(westLuma, eastLuma)));
  maxLuma = max(maxLuma, max(max(northLuma, southLuma), max(westLuma, eastLuma)));

  if (sampleCount >= 8u) {
    let nwLuma = luma(load_rgb(coord + vec2i(-radius, -radius), size));
    let neLuma = luma(load_rgb(coord + vec2i(radius, -radius), size));
    let swLuma = luma(load_rgb(coord + vec2i(-radius, radius), size));
    let seLuma = luma(load_rgb(coord + vec2i(radius, radius), size));
    minLuma = min(minLuma, min(min(nwLuma, neLuma), min(swLuma, seLuma)));
    maxLuma = max(maxLuma, max(max(nwLuma, neLuma), max(swLuma, seLuma)));
  }

  return vec2f(minLuma, maxLuma);
}

fn fxaa_edge_mask(coord: vec2i, size: vec2u) -> f32 {
  let color = load_rgb(coord, size);
  let lumaRange = local_luma_range(coord, size, color);
  let contrast = lumaRange.y - lumaRange.x;
  let edgeThreshold = max(FXAA_EDGE_THRESHOLD_MIN, lumaRange.y * FXAA_EDGE_THRESHOLD);
  return ramp(edgeThreshold, edgeThreshold * 5.0, contrast);
}

fn fxaa_filter(coord: vec2i, size: vec2u) -> vec3f {
  let center = load_rgb(coord, size);
  let radius = configured_radius();
  let north = load_rgb(coord + vec2i(0, -radius), size);
  let south = load_rgb(coord + vec2i(0, radius), size);
  let west = load_rgb(coord + vec2i(-radius, 0), size);
  let east = load_rgb(coord + vec2i(radius, 0), size);

  let centerLuma = luma(center);
  let northLuma = luma(north);
  let southLuma = luma(south);
  let westLuma = luma(west);
  let eastLuma = luma(east);
  let lumaRange = local_luma_range(coord, size, center);
  let contrast = lumaRange.y - lumaRange.x;
  let edgeThreshold = max(FXAA_EDGE_THRESHOLD_MIN, lumaRange.y * FXAA_EDGE_THRESHOLD);
  if (contrast < edgeThreshold) {
    return center;
  }

  let horizontalEdge = abs(northLuma + southLuma - 2.0 * centerLuma);
  let verticalEdge = abs(westLuma + eastLuma - 2.0 * centerLuma);
  let axisBlend = select(
    (west + east) * 0.5,
    (north + south) * 0.5,
    horizontalEdge >= verticalEdge
  );
  let wideBlend = neighborhood_average(coord, size);
  let wideWeight = select(0.0, 0.45, configured_sample_count() >= 8u);
  let resolveTarget = mix(axisBlend, wideBlend, wideWeight);
  let blendAmount = clamp(contrast / max(lumaRange.y, 0.0001), 0.0, 1.0) * 0.45;
  return mix(center, resolveTarget, blendAmount);
}

fn cas_alias_risk(coord: vec2i, size: vec2u, color: vec3f) -> f32 {
  let radius = configured_radius();
  let centerLuma = luma(color);
  let northLuma = luma(load_rgb(coord + vec2i(0, -radius), size));
  let southLuma = luma(load_rgb(coord + vec2i(0, radius), size));
  let westLuma = luma(load_rgb(coord + vec2i(-radius, 0), size));
  let eastLuma = luma(load_rgb(coord + vec2i(radius, 0), size));
  let lumaRange = local_luma_range(coord, size, color);
  let contrast = lumaRange.y - lumaRange.x;
  let axisCurvature =
    abs(northLuma + southLuma - 2.0 * centerLuma) +
    abs(westLuma + eastLuma - 2.0 * centerLuma);

  var diagonalCurvature = 0.0;
  if (configured_sample_count() >= 8u) {
    let nwLuma = luma(load_rgb(coord + vec2i(-radius, -radius), size));
    let neLuma = luma(load_rgb(coord + vec2i(radius, -radius), size));
    let swLuma = luma(load_rgb(coord + vec2i(-radius, radius), size));
    let seLuma = luma(load_rgb(coord + vec2i(radius, radius), size));
    diagonalCurvature =
      abs(nwLuma + seLuma - 2.0 * centerLuma) +
      abs(neLuma + swLuma - 2.0 * centerLuma);
  }

  let normalizedCurvature = (axisCurvature + diagonalCurvature * 0.6) / max(contrast, 0.02);
  let curvatureRisk = ramp(0.35, 1.35, normalizedCurvature) * ramp(0.035, 0.20, contrast);
  return clamp(max(curvatureRisk, fxaa_edge_mask(coord, size) * 0.35), 0.0, 0.92);
}

fn cas_detail_mask(coord: vec2i, size: vec2u, color: vec3f) -> f32 {
  let lowPass = neighborhood_average(coord, size);
  let lumaRange = local_luma_range(coord, size, color);
  let contrast = lumaRange.y - lumaRange.x;
  let detail = abs(luma(color) - luma(lowPass));
  let centerDetail = ramp(0.006, 0.055, detail);
  let neighborhoodDetail = ramp(0.018, 0.16, contrast) * 0.45;
  return clamp(max(centerDetail, neighborhoodDetail), 0.0, 1.0);
}

fn cas_strength_mask(coord: vec2i, size: vec2u, color: vec3f) -> f32 {
  return cas_detail_mask(coord, size, color) * (1.0 - cas_alias_risk(coord, size, color));
}

fn cas_sharpen(coord: vec2i, size: vec2u, color: vec3f) -> vec3f {
  let lowPass = neighborhood_average(coord, size);
  let effectiveSharpness = settings.casSharpness * cas_strength_mask(coord, size, color);
  let localMin = local_min_rgb(coord, size, color);
  let localMax = local_max_rgb(coord, size, color);
  let sharpened = color + (color - lowPass) * effectiveSharpness;
  let localRange = max(localMax - localMin, vec3f(0.001));
  let haloWindow = localRange * effectiveSharpness * 0.65;
  return clamp(sharpened, max(vec3f(0.0), localMin - haloWindow), localMax + haloWindow);
}

@compute @workgroup_size(8, 8, 1)
fn fxaa_cas_post_process(@builtin(global_invocation_id) globalId: vec3u) {
  let outputSize = textureDimensions(postProcessOutput);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) {
    return;
  }
  let coord = vec2i(globalId.xy);
  let source = textureLoad(postProcessInput, coord, 0);
  if (settings.enabled == 0u) {
    textureStore(postProcessOutput, coord, source);
    return;
  }

  let fxaaMask = fxaa_edge_mask(coord, outputSize);
  let fxaaColor = select(source.rgb, fxaa_filter(coord, outputSize), settings.fxaaEnabled != 0u);
  let casMask = select(0.0, cas_strength_mask(coord, outputSize, fxaaColor), settings.casEnabled != 0u);
  let casColor = select(fxaaColor, cas_sharpen(coord, outputSize, fxaaColor), settings.casEnabled != 0u);
  let finalColor = max(casColor, vec3f(0.0));

  if (settings.debugView == DEBUG_VIEW_FXAA_MASK) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(fxaaMask), source.a));
  } else if (settings.debugView == DEBUG_VIEW_CAS_MASK) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(casMask), source.a));
  } else if (settings.debugView == DEBUG_VIEW_DIFFERENCE) {
    textureStore(postProcessOutput, coord, vec4f(clamp(abs(finalColor - source.rgb) * 6.0, vec3f(0.0), vec3f(1.0)), source.a));
  } else {
    textureStore(postProcessOutput, coord, vec4f(finalColor, source.a));
  }
}
