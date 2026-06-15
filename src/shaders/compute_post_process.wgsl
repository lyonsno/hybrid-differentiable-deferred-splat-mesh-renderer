@group(0) @binding(0) var postProcessInput: texture_2d<f32>;
@group(0) @binding(1) var postProcessOutput: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var postProcessAux: texture_2d<f32>;

struct PostProcessSettings {
  enabled: u32,
  fxaaEnabled: u32,
  casEnabled: u32,
  sampleRadius: u32,
  sampleCount: u32,
  debugView: u32,
  casSharpness: f32,
  dofEnabled: u32,
  dofFocusDepth: f32,
  dofStrength: f32,
  dofRadius: u32,
  _pad0: u32,
};

@group(0) @binding(2) var<uniform> settings: PostProcessSettings;

const FXAA_EDGE_THRESHOLD = 0.0312;
const FXAA_EDGE_THRESHOLD_MIN = 0.00625;
const DEBUG_VIEW_FINAL = 0u;
const DEBUG_VIEW_FXAA_MASK = 1u;
const DEBUG_VIEW_CAS_MASK = 2u;
const DEBUG_VIEW_DIFFERENCE = 3u;
const DEBUG_VIEW_DEPTH = 4u;
const DEBUG_VIEW_CONFIDENCE = 5u;
const DEBUG_VIEW_DOF_MASK = 6u;

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

fn load_aux(coord: vec2i, size: vec2u) -> vec4f {
  return textureLoad(postProcessAux, clamp_coord(coord, size), 0);
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

fn dof_circle_of_confusion(coord: vec2i, size: vec2u) -> f32 {
  let aux = load_aux(coord, size);
  let depth = clamp(aux.r, 0.0, 1.0);
  let coverageConfidence = clamp(aux.g, 0.0, 1.0);
  let focusDepth = clamp(settings.dofFocusDepth, 0.0, 1.0);
  let maxRadius = f32(clamp(settings.dofRadius, 1u, 8u));
  let focusDistance = max(abs(depth - focusDepth) - 0.025, 0.0);
  return clamp(focusDistance * settings.dofStrength * coverageConfidence * maxRadius, 0.0, maxRadius);
}

fn dof_sample(coord: vec2i, size: vec2u, originDepth: f32, originCoc: f32, offset: vec2i) -> vec4f {
  let sampleCoord = coord + offset;
  let sampleAux = load_aux(sampleCoord, size);
  let sampleDepth = clamp(sampleAux.r, 0.0, 1.0);
  let sampleConfidence = clamp(sampleAux.g, 0.0, 1.0);
  let sampleCoc = dof_circle_of_confusion(sampleCoord, size);
  let depthDiff = abs(sampleDepth - originDepth);
  let depthWeight = 1.0 - ramp(0.025, 0.16, depthDiff);
  let blurWeight = clamp(max(originCoc, sampleCoc) / max(f32(clamp(settings.dofRadius, 1u, 8u)), 1.0), 0.05, 1.0);
  let weight = max(0.0, depthWeight * blurWeight * max(sampleConfidence, 0.2));
  return vec4f(load_rgb(sampleCoord, size) * weight, weight);
}

fn depth_confidence_guided_dof(coord: vec2i, size: vec2u, color: vec3f) -> vec3f {
  let originAux = load_aux(coord, size);
  let originDepth = clamp(originAux.r, 0.0, 1.0);
  let originCoc = dof_circle_of_confusion(coord, size);
  if (originCoc < 0.35) {
    return color;
  }

  let radius = i32(max(1.0, ceil(originCoc)));
  let nearRadius = max(1, radius / 2);
  var sum = vec3f(0.0);
  var weightSum = 0.0;

  let centerWeight = 1.0;
  sum += color * centerWeight;
  weightSum += centerWeight;

  let north = dof_sample(coord, size, originDepth, originCoc, vec2i(0, -radius));
  let south = dof_sample(coord, size, originDepth, originCoc, vec2i(0, radius));
  let west = dof_sample(coord, size, originDepth, originCoc, vec2i(-radius, 0));
  let east = dof_sample(coord, size, originDepth, originCoc, vec2i(radius, 0));
  sum += north.rgb + south.rgb + west.rgb + east.rgb;
  weightSum += north.a + south.a + west.a + east.a;

  let nw = dof_sample(coord, size, originDepth, originCoc, vec2i(-radius, -radius));
  let ne = dof_sample(coord, size, originDepth, originCoc, vec2i(radius, -radius));
  let sw = dof_sample(coord, size, originDepth, originCoc, vec2i(-radius, radius));
  let se = dof_sample(coord, size, originDepth, originCoc, vec2i(radius, radius));
  sum += nw.rgb + ne.rgb + sw.rgb + se.rgb;
  weightSum += nw.a + ne.a + sw.a + se.a;

  if (configured_sample_count() >= 12u) {
    let n = dof_sample(coord, size, originDepth, originCoc, vec2i(0, -nearRadius));
    let s = dof_sample(coord, size, originDepth, originCoc, vec2i(0, nearRadius));
    let w = dof_sample(coord, size, originDepth, originCoc, vec2i(-nearRadius, 0));
    let e = dof_sample(coord, size, originDepth, originCoc, vec2i(nearRadius, 0));
    sum += n.rgb + s.rgb + w.rgb + e.rgb;
    weightSum += n.a + s.a + w.a + e.a;
  }

  let blurred = sum / max(weightSum, 0.0001);
  let dofBlend = clamp(originCoc / max(f32(clamp(settings.dofRadius, 1u, 8u)), 1.0), 0.0, 1.0);
  return mix(color, blurred, dofBlend);
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
  let dofColor = select(casColor, depth_confidence_guided_dof(coord, outputSize, casColor), settings.dofEnabled != 0u);
  let finalColor = max(dofColor, vec3f(0.0));
  let aux = load_aux(coord, outputSize);
  let dofMask = clamp(dof_circle_of_confusion(coord, outputSize) / max(f32(clamp(settings.dofRadius, 1u, 8u)), 1.0), 0.0, 1.0);

  if (settings.debugView == DEBUG_VIEW_FXAA_MASK) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(fxaaMask), source.a));
  } else if (settings.debugView == DEBUG_VIEW_CAS_MASK) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(casMask), source.a));
  } else if (settings.debugView == DEBUG_VIEW_DIFFERENCE) {
    textureStore(postProcessOutput, coord, vec4f(clamp(abs(finalColor - source.rgb) * 6.0, vec3f(0.0), vec3f(1.0)), source.a));
  } else if (settings.debugView == DEBUG_VIEW_DEPTH) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(clamp(aux.r * aux.g, 0.0, 1.0)), source.a));
  } else if (settings.debugView == DEBUG_VIEW_CONFIDENCE) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(clamp(aux.g, 0.0, 1.0)), source.a));
  } else if (settings.debugView == DEBUG_VIEW_DOF_MASK) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(dofMask), source.a));
  } else {
    textureStore(postProcessOutput, coord, vec4f(finalColor, source.a));
  }
}
