@group(0) @binding(0) var postProcessInput: texture_2d<f32>;
@group(0) @binding(1) var postProcessOutput: texture_storage_2d<rgba16float, write>;
@group(0) @binding(3) var postProcessAux: texture_2d<f32>;
@group(0) @binding(4) var postProcessDofBlur: texture_2d<f32>;
@group(0) @binding(5) var postProcessDofQuarterBlur: texture_2d<f32>;

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
  dofNearEnabled: u32,
  dofFarEnabled: u32,
  dofNearPlaneDepth: f32,
  dofFarPlaneDepth: f32,
  dofNearBlur: f32,
  dofFarBlur: f32,
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
const DEBUG_VIEW_DOF_DOWNSAMPLE = 7u;
const DEBUG_VIEW_DOF_BLUR_H = 8u;
const DEBUG_VIEW_DOF_BLUR_V_ONLY = 9u;
const DEBUG_VIEW_DOF_BLUR_HV = 10u;
const DEBUG_VIEW_DOF_LAYERS = 11u;
const DEBUG_VIEW_DOF_NEAR_MASK = 12u;
const DEBUG_VIEW_DOF_FAR_MASK = 13u;
const POST_PROCESS_DOF_DEBUG_MASK_GAMMA = 0.5;
const POST_PROCESS_DOF_BLUR_MAX_TAPS = 17i;
const POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS = 8i;

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

fn smooth_ramp(edge0: f32, edge1: f32, value: f32) -> f32 {
  let t = ramp(edge0, edge1, value);
  return t * t * (3.0 - 2.0 * t);
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
    count = 8.0;
  }
  if (sampleCount >= 12u) {
    let halfRadius = max(1, radius / 2);
    sum += load_rgb(coord + vec2i(0, -halfRadius), size);
    sum += load_rgb(coord + vec2i(0, halfRadius), size);
    sum += load_rgb(coord + vec2i(-halfRadius, 0), size);
    sum += load_rgb(coord + vec2i(halfRadius, 0), size);
    count = 12.0;
  }
  return sum / count;
}

fn local_luma_range(coord: vec2i, size: vec2u, center: vec3f) -> vec2f {
  let radius = configured_radius();
  let n = luma(load_rgb(coord + vec2i(0, -radius), size));
  let s = luma(load_rgb(coord + vec2i(0, radius), size));
  let w = luma(load_rgb(coord + vec2i(-radius, 0), size));
  let e = luma(load_rgb(coord + vec2i(radius, 0), size));
  let c = luma(center);
  var lo = min(min(n, s), min(w, min(e, c)));
  var hi = max(max(n, s), max(w, max(e, c)));

  if (configured_sample_count() >= 8u) {
    let nw = luma(load_rgb(coord + vec2i(-radius, -radius), size));
    let ne = luma(load_rgb(coord + vec2i(radius, -radius), size));
    let sw = luma(load_rgb(coord + vec2i(-radius, radius), size));
    let se = luma(load_rgb(coord + vec2i(radius, radius), size));
    lo = min(lo, min(min(nw, ne), min(sw, se)));
    hi = max(hi, max(max(nw, ne), max(sw, se)));
  }
  return vec2f(lo, hi);
}

fn local_min_rgb(coord: vec2i, size: vec2u, center: vec3f) -> vec3f {
  let radius = configured_radius();
  let n = load_rgb(coord + vec2i(0, -radius), size);
  let s = load_rgb(coord + vec2i(0, radius), size);
  let w = load_rgb(coord + vec2i(-radius, 0), size);
  let e = load_rgb(coord + vec2i(radius, 0), size);
  return min(center, min(min(n, s), min(w, e)));
}

fn local_max_rgb(coord: vec2i, size: vec2u, center: vec3f) -> vec3f {
  let radius = configured_radius();
  let n = load_rgb(coord + vec2i(0, -radius), size);
  let s = load_rgb(coord + vec2i(0, radius), size);
  let w = load_rgb(coord + vec2i(-radius, 0), size);
  let e = load_rgb(coord + vec2i(radius, 0), size);
  return max(center, max(max(n, s), max(w, e)));
}

fn fxaa_edge_mask(coord: vec2i, size: vec2u) -> f32 {
  let center = load_rgb(coord, size);
  let lumaRange = local_luma_range(coord, size, center);
  let contrast = lumaRange.y - lumaRange.x;
  let edgeThreshold = max(FXAA_EDGE_THRESHOLD_MIN, lumaRange.y * FXAA_EDGE_THRESHOLD);
  return ramp(edgeThreshold * 0.75, edgeThreshold * 2.0, contrast);
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

// --- DOF: two-layer (near + far) with dynamic kernel radius ---

fn dof_max_radius() -> f32 {
  return f32(clamp(settings.dofRadius, 1u, 128u));
}

fn dof_circle_of_confusion(coord: vec2i, size: vec2u) -> f32 {
  let aux = load_aux(coord, size);
  let depth = clamp(aux.r, 0.0, 1.0);
  let coverageConfidence = clamp(aux.g, 0.0, 1.0);
  let focusDepth = clamp(settings.dofFocusDepth, 0.0, 1.0);
  let nearPlane = clamp(settings.dofNearPlaneDepth, 0.0, focusDepth);
  let farPlane = clamp(settings.dofFarPlaneDepth, focusDepth, 1.0);
  let aperture = clamp(settings.dofStrength, 0.0, 4.0);
  let maxR = dof_max_radius();

  // Near CoC: ramps from 0 at focusDepth to maxR at nearPlane
  let nearDistance = 1.0 - smooth_ramp(nearPlane, focusDepth, depth);
  let nearCoc = nearDistance * aperture * maxR * clamp(settings.dofNearBlur, 0.0, 1.0);

  // Far CoC: ramps from 0 at focusDepth to maxR at farPlane
  let farDistance = smooth_ramp(focusDepth, farPlane, depth);
  let farCoc = farDistance * aperture * maxR * clamp(settings.dofFarBlur, 0.0, 1.0);

  // Enable gating
  let nearGated = select(0.0, nearCoc, settings.dofNearEnabled != 0u);
  let farGated = select(0.0, farCoc, settings.dofFarEnabled != 0u);

  return clamp(max(nearGated, farGated) * coverageConfidence, 0.0, maxR);
}

fn dof_signed_coc(coord: vec2i, size: vec2u) -> f32 {
  // Positive = near (foreground), negative = far (background)
  let aux = load_aux(coord, size);
  let depth = clamp(aux.r, 0.0, 1.0);
  let coverageConfidence = clamp(aux.g, 0.0, 1.0);
  let focusDepth = clamp(settings.dofFocusDepth, 0.0, 1.0);
  let nearPlane = clamp(settings.dofNearPlaneDepth, 0.0, focusDepth);
  let farPlane = clamp(settings.dofFarPlaneDepth, focusDepth, 1.0);
  let aperture = clamp(settings.dofStrength, 0.0, 4.0);
  let maxR = dof_max_radius();

  let nearDistance = 1.0 - smooth_ramp(nearPlane, focusDepth, depth);
  let nearCoc = nearDistance * aperture * maxR * clamp(settings.dofNearBlur, 0.0, 1.0);
  let farDistance = smooth_ramp(focusDepth, farPlane, depth);
  let farCoc = farDistance * aperture * maxR * clamp(settings.dofFarBlur, 0.0, 1.0);

  let nearGated = select(0.0, nearCoc, settings.dofNearEnabled != 0u);
  let farGated = select(0.0, farCoc, settings.dofFarEnabled != 0u);

  // Near wins if both active, sign differentiates
  if (nearGated >= farGated) {
    return clamp(nearGated * coverageConfidence, 0.0, maxR);
  }
  return clamp(-farGated * coverageConfidence, -maxR, 0.0);
}

fn dof_near_weight(coord: vec2i, size: vec2u) -> f32 {
  let aux = load_aux(coord, size);
  let depth = clamp(aux.r, 0.0, 1.0);
  let focusDepth = clamp(settings.dofFocusDepth, 0.0, 1.0);
  let nearPlane = clamp(settings.dofNearPlaneDepth, 0.0, focusDepth);
  let nearDistance = 1.0 - smooth_ramp(nearPlane, focusDepth, depth);
  return select(0.0, nearDistance, settings.dofNearEnabled != 0u);
}

fn dof_far_weight(coord: vec2i, size: vec2u) -> f32 {
  let aux = load_aux(coord, size);
  let depth = clamp(aux.r, 0.0, 1.0);
  let focusDepth = clamp(settings.dofFocusDepth, 0.0, 1.0);
  let farPlane = clamp(settings.dofFarPlaneDepth, focusDepth, 1.0);
  let farDistance = smooth_ramp(focusDepth, farPlane, depth);
  return select(0.0, farDistance, settings.dofFarEnabled != 0u);
}

fn dof_debug_mask(mask: f32) -> f32 {
  return pow(clamp(mask, 0.0, 1.0), POST_PROCESS_DOF_DEBUG_MASK_GAMMA);
}

fn dof_layer_debug_rgb(coord: vec2i, size: vec2u) -> vec3f {
  let near = dof_near_weight(coord, size);
  let far = dof_far_weight(coord, size);
  // Red = near, Blue = far, Green = focus (neither)
  let focus = clamp(1.0 - max(near, far), 0.0, 1.0);
  return vec3f(dof_debug_mask(near), dof_debug_mask(focus), dof_debug_mask(far));
}

fn load_dof_blur_pixel(coord: vec2i, size: vec2u) -> vec4f {
  return textureLoad(postProcessDofBlur, clamp_coord(coord, size), 0);
}

fn resolve_weighted_dof_color(weightedColor: vec3f, occupancy: f32, fallback: vec3f) -> vec3f {
  return select(fallback, weightedColor / occupancy, occupancy > 0.0001);
}

fn load_dof_wide_blur_bilinear(coord: vec2i, size: vec2u) -> vec4f {
  let blurSize = textureDimensions(postProcessDofBlur);
  let blurUv = ((vec2f(coord) + vec2f(0.5)) / vec2f(size)) * vec2f(blurSize) - vec2f(0.5);
  let base = vec2i(floor(blurUv));
  let f = fract(blurUv);
  let c00 = load_dof_blur_pixel(base, blurSize);
  let c10 = load_dof_blur_pixel(base + vec2i(1, 0), blurSize);
  let c01 = load_dof_blur_pixel(base + vec2i(0, 1), blurSize);
  let c11 = load_dof_blur_pixel(base + vec2i(1, 1), blurSize);
  let w00 = (1.0 - f.x) * (1.0 - f.y);
  let w10 = f.x * (1.0 - f.y);
  let w01 = (1.0 - f.x) * f.y;
  let w11 = f.x * f.y;
  let occupancy = c00.a * w00 + c10.a * w10 + c01.a * w01 + c11.a * w11;
  let weightedColor = c00.rgb * c00.a * w00 +
    c10.rgb * c10.a * w10 +
    c01.rgb * c01.a * w01 +
    c11.rgb * c11.a * w11;
  let fallback = mix(mix(c00.rgb, c10.rgb, f.x), mix(c01.rgb, c11.rgb, f.x), f.y);
  return vec4f(resolve_weighted_dof_color(weightedColor, occupancy, fallback), clamp(occupancy, 0.0, 1.0));
}

fn load_dof_wide_blur(coord: vec2i, size: vec2u) -> vec4f {
  return load_dof_wide_blur_bilinear(coord, size);
}

// Dynamic-radius DOF composite: uses CoC to pick blur result, not blend-with-sharp
// Near field uses quarter-res blur for substantially wider blur; far uses half-res.
// Near-field silhouette expansion: even in-focus pixels receive blur when the
// half-res blurred occupancy indicates a nearby foreground object's halo.
fn depth_confidence_guided_dof(coord: vec2i, size: vec2u, color: vec3f) -> vec3f {
  let coc = dof_circle_of_confusion(coord, size);
  let maxR = dof_max_radius();
  let nearWeight = dof_near_weight(coord, size);

  // Load half-res blur — its alpha carries dilated near-field influence
  let halfBlur = load_dof_wide_blur(coord, size);
  let quarterBlur = load_dof_quarter_blur_bilinear(coord, size);

  // Near-field silhouette expansion: the blurred texture's alpha naturally
  // spreads beyond the geometric edge of foreground objects. Use it to
  // let near-field blur bleed over in-focus content behind foreground objects.
  let nearHaloInfluence = max(halfBlur.a, quarterBlur.a);
  let nearHaloBleed = clamp(nearHaloInfluence * (1.0 - nearWeight), 0.0, 1.0);
  let effectiveCoc = max(coc, nearHaloBleed * maxR * 0.5);

  if (effectiveCoc < 0.5) {
    return color;
  }

  // Near field with large CoC uses quarter-res; far field uses half-res
  let quarterBlendStart = maxR * 0.15;
  let quarterBlendEnd = maxR * 0.4;
  let quarterAmount = nearWeight * smooth_ramp(quarterBlendStart, quarterBlendEnd, effectiveCoc);
  let blurColor = select(
    halfBlur.rgb,
    mix(halfBlur.rgb, quarterBlur.rgb, quarterAmount),
    quarterBlur.a > 0.01
  );
  let blurOccupancy = mix(halfBlur.a, max(halfBlur.a, quarterBlur.a), quarterAmount);

  // Transition from sharp to blurred driven by effective CoC
  let transitionStart = 2.0;
  let transitionEnd = max(8.0, maxR * 0.15);
  let blurAmount = smooth_ramp(transitionStart, transitionEnd, effectiveCoc);

  // For silhouette expansion, scale by the halo influence so the bleed
  // is strongest right at the foreground edge and fades smoothly
  let haloScale = select(1.0, nearHaloInfluence, coc < 0.5);
  let finalBlurAmount = blurAmount * haloScale;

  let blurred = select(color, blurColor, blurOccupancy > 0.01);

  return mix(color, blurred, finalBlurAmount);
}

// --- Downsample pass: writes CoC into alpha for dynamic-radius blur ---

fn dof_downsample_tap(sampleCoord: vec2i, inputSize: vec2u) -> vec4f {
  let confidence = clamp(load_aux(sampleCoord, inputSize).g, 0.0, 1.0);
  let coc = abs(dof_signed_coc(sampleCoord, inputSize));
  let weight = confidence * clamp(coc / max(dof_max_radius(), 1.0), 0.05, 1.0);
  return vec4f(load_rgb(sampleCoord, inputSize) * weight, weight);
}

@compute @workgroup_size(8, 8, 1)
fn dof_downsample(@builtin(global_invocation_id) globalId: vec3u) {
  let outputSize = textureDimensions(postProcessOutput);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) {
    return;
  }

  let inputSize = textureDimensions(postProcessInput);
  let coord = vec2i(globalId.xy);
  let sourceCoord = coord * 2;
  let t0 = dof_downsample_tap(sourceCoord, inputSize);
  let t1 = dof_downsample_tap(sourceCoord + vec2i(1, 0), inputSize);
  let t2 = dof_downsample_tap(sourceCoord + vec2i(0, 1), inputSize);
  let t3 = dof_downsample_tap(sourceCoord + vec2i(1, 1), inputSize);
  let tapSum = t0 + t1 + t2 + t3;
  let occupancy = clamp(tapSum.a * 0.25, 0.0, 1.0);
  let downsampled = vec4f(resolve_weighted_dof_color(tapSum.rgb, tapSum.a, load_rgb(sourceCoord, inputSize)), occupancy);
  textureStore(postProcessOutput, coord, vec4f(downsampled.rgb, downsampled.a));
}

// --- Blur passes: dynamic per-pixel radius from CoC ---

fn dof_blur_radius_for_pixel(coord: vec2i, size: vec2u) -> i32 {
  // Read CoC at the corresponding full-res location
  let inputSize = textureDimensions(postProcessAux);
  let fullCoord = coord * 2;
  let coc = abs(dof_signed_coc(fullCoord, inputSize));
  // Half-res radius: coc is in full-res pixels, blur runs at half-res
  let halfResCoc = coc * 0.5;
  return clamp(i32(ceil(halfResCoc)), 1, i32(POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS));
}

fn dof_blur_sample_dynamic(coord: vec2i, size: vec2u, axis: vec2i) -> vec4f {
  let pixelRadius = dof_blur_radius_for_pixel(coord, size);
  let sigma = max(f32(pixelRadius) * 0.42, 1.0);
  let sparseThreshold = max(pixelRadius / 2, 1);
  var sum = vec3f(0.0);
  var occupancySum = 0.0;
  var weightSum = 0.0;
  for (var tap = -POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS; tap <= POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS; tap = tap + 1) {
    let baseSampleOffset = i32(round(f32(tap) * f32(pixelRadius) / f32(POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS)));
    if (abs(baseSampleOffset) > pixelRadius) {
      continue;
    }
    // Sparse outer taps: stride 2 beyond sparseThreshold, weight compensates
    let inOuter = abs(baseSampleOffset) > sparseThreshold;
    let stride = select(1, 2, inOuter);
    let sampleOffset = select(baseSampleOffset, (baseSampleOffset / 2) * 2, inOuter);
    let strideCompensation = f32(stride);
    let normalizedOffset = f32(sampleOffset) / sigma;
    let weight = exp(-0.5 * normalizedOffset * normalizedOffset) * strideCompensation;
    let sample = textureLoad(postProcessInput, clamp_coord(coord + axis * sampleOffset, size), 0);
    sum += sample.rgb * sample.a * weight;
    occupancySum += sample.a * weight;
    weightSum += weight;
  }
  let occupancy = clamp(occupancySum / max(weightSum, 0.0001), 0.0, 1.0);
  return vec4f(resolve_weighted_dof_color(sum, occupancySum, vec3f(0.0)), occupancy);
}

fn dof_blur_dynamic(axis: vec2i, globalId: vec3u) {
  let outputSize = textureDimensions(postProcessOutput);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) {
    return;
  }

  let coord = vec2i(globalId.xy);
  let blurred = dof_blur_sample_dynamic(coord, outputSize, axis);
  textureStore(postProcessOutput, coord, vec4f(max(blurred.rgb, vec3f(0.0)), blurred.a));
}

@compute @workgroup_size(8, 8, 1)
fn dof_blur_horizontal(@builtin(global_invocation_id) globalId: vec3u) {
  dof_blur_dynamic(vec2i(1, 0), globalId);
}

@compute @workgroup_size(8, 8, 1)
fn dof_blur_vertical(@builtin(global_invocation_id) globalId: vec3u) {
  dof_blur_dynamic(vec2i(0, 1), globalId);
}

// --- Quarter-res near-field blur path ---

@compute @workgroup_size(8, 8, 1)
fn dof_quarter_downsample(@builtin(global_invocation_id) globalId: vec3u) {
  let outputSize = textureDimensions(postProcessOutput);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) {
    return;
  }

  let inputSize = textureDimensions(postProcessInput);
  let coord = vec2i(globalId.xy);
  let sourceCoord = coord * 2;
  let c00 = textureLoad(postProcessInput, clamp_coord(sourceCoord, inputSize), 0);
  let c10 = textureLoad(postProcessInput, clamp_coord(sourceCoord + vec2i(1, 0), inputSize), 0);
  let c01 = textureLoad(postProcessInput, clamp_coord(sourceCoord + vec2i(0, 1), inputSize), 0);
  let c11 = textureLoad(postProcessInput, clamp_coord(sourceCoord + vec2i(1, 1), inputSize), 0);
  let totalOccupancy = c00.a + c10.a + c01.a + c11.a;
  let weightedRgb = c00.rgb * c00.a + c10.rgb * c10.a + c01.rgb * c01.a + c11.rgb * c11.a;
  let occupancy = clamp(totalOccupancy * 0.25, 0.0, 1.0);
  let resolved = resolve_weighted_dof_color(weightedRgb, totalOccupancy, c00.rgb);
  textureStore(postProcessOutput, coord, vec4f(resolved, occupancy));
}

fn dof_quarter_blur_radius_for_pixel(coord: vec2i, size: vec2u) -> i32 {
  let inputSize = textureDimensions(postProcessAux);
  let fullCoord = coord * 4;
  let coc = abs(dof_signed_coc(fullCoord, inputSize));
  let quarterResCoc = coc * 0.25;
  return clamp(i32(ceil(quarterResCoc)), 1, i32(POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS));
}

fn dof_quarter_blur_sample_dynamic(coord: vec2i, size: vec2u, axis: vec2i) -> vec4f {
  let pixelRadius = dof_quarter_blur_radius_for_pixel(coord, size);
  let sigma = max(f32(pixelRadius) * 0.42, 1.0);
  let sparseThreshold = max(pixelRadius / 2, 1);
  var sum = vec3f(0.0);
  var occupancySum = 0.0;
  var weightSum = 0.0;
  for (var tap = -POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS; tap <= POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS; tap = tap + 1) {
    let baseSampleOffset = i32(round(f32(tap) * f32(pixelRadius) / f32(POST_PROCESS_DOF_BLUR_MAX_HALF_TAPS)));
    if (abs(baseSampleOffset) > pixelRadius) {
      continue;
    }
    let inOuter = abs(baseSampleOffset) > sparseThreshold;
    let stride = select(1, 2, inOuter);
    let sampleOffset = select(baseSampleOffset, (baseSampleOffset / 2) * 2, inOuter);
    let strideCompensation = f32(stride);
    let normalizedOffset = f32(sampleOffset) / sigma;
    let weight = exp(-0.5 * normalizedOffset * normalizedOffset) * strideCompensation;
    let sample = textureLoad(postProcessInput, clamp_coord(coord + axis * sampleOffset, size), 0);
    sum += sample.rgb * sample.a * weight;
    occupancySum += sample.a * weight;
    weightSum += weight;
  }
  let occupancy = clamp(occupancySum / max(weightSum, 0.0001), 0.0, 1.0);
  return vec4f(resolve_weighted_dof_color(sum, occupancySum, vec3f(0.0)), occupancy);
}

fn dof_quarter_blur_dynamic(axis: vec2i, globalId: vec3u) {
  let outputSize = textureDimensions(postProcessOutput);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) {
    return;
  }
  let coord = vec2i(globalId.xy);
  let blurred = dof_quarter_blur_sample_dynamic(coord, outputSize, axis);
  textureStore(postProcessOutput, coord, vec4f(max(blurred.rgb, vec3f(0.0)), blurred.a));
}

@compute @workgroup_size(8, 8, 1)
fn dof_quarter_blur_horizontal(@builtin(global_invocation_id) globalId: vec3u) {
  dof_quarter_blur_dynamic(vec2i(1, 0), globalId);
}

@compute @workgroup_size(8, 8, 1)
fn dof_quarter_blur_vertical(@builtin(global_invocation_id) globalId: vec3u) {
  dof_quarter_blur_dynamic(vec2i(0, 1), globalId);
}

fn load_dof_quarter_blur_bilinear(coord: vec2i, size: vec2u) -> vec4f {
  let blurSize = textureDimensions(postProcessDofQuarterBlur);
  let blurUv = ((vec2f(coord) + vec2f(0.5)) / vec2f(size)) * vec2f(blurSize) - vec2f(0.5);
  let base = vec2i(floor(blurUv));
  let f = fract(blurUv);
  let c00 = textureLoad(postProcessDofQuarterBlur, clamp_coord(base, blurSize), 0);
  let c10 = textureLoad(postProcessDofQuarterBlur, clamp_coord(base + vec2i(1, 0), blurSize), 0);
  let c01 = textureLoad(postProcessDofQuarterBlur, clamp_coord(base + vec2i(0, 1), blurSize), 0);
  let c11 = textureLoad(postProcessDofQuarterBlur, clamp_coord(base + vec2i(1, 1), blurSize), 0);
  let w00 = (1.0 - f.x) * (1.0 - f.y);
  let w10 = f.x * (1.0 - f.y);
  let w01 = (1.0 - f.x) * f.y;
  let w11 = f.x * f.y;
  let occupancy = c00.a * w00 + c10.a * w10 + c01.a * w01 + c11.a * w11;
  let weightedColor = c00.rgb * c00.a * w00 + c10.rgb * c10.a * w10 +
    c01.rgb * c01.a * w01 + c11.rgb * c11.a * w11;
  let fallback = mix(mix(c00.rgb, c10.rgb, f.x), mix(c01.rgb, c11.rgb, f.x), f.y);
  return vec4f(resolve_weighted_dof_color(weightedColor, occupancy, fallback), clamp(occupancy, 0.0, 1.0));
}

// --- Final composite pass ---

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
  let cocValue = dof_circle_of_confusion(coord, outputSize);
  let dofMask = clamp(cocValue / max(dof_max_radius(), 1.0), 0.0, 1.0);

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
    textureStore(postProcessOutput, coord, vec4f(vec3f(dof_debug_mask(dofMask)), 1.0));
  } else if (settings.debugView == DEBUG_VIEW_DOF_LAYERS) {
    textureStore(postProcessOutput, coord, vec4f(dof_layer_debug_rgb(coord, outputSize), 1.0));
  } else if (settings.debugView == DEBUG_VIEW_DOF_NEAR_MASK) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(dof_debug_mask(dof_near_weight(coord, outputSize))), 1.0));
  } else if (settings.debugView == DEBUG_VIEW_DOF_FAR_MASK) {
    textureStore(postProcessOutput, coord, vec4f(vec3f(dof_debug_mask(dof_far_weight(coord, outputSize))), 1.0));
  } else if (
    settings.debugView == DEBUG_VIEW_DOF_DOWNSAMPLE ||
    settings.debugView == DEBUG_VIEW_DOF_BLUR_H ||
    settings.debugView == DEBUG_VIEW_DOF_BLUR_V_ONLY ||
    settings.debugView == DEBUG_VIEW_DOF_BLUR_HV
  ) {
    let wideDebug = load_dof_wide_blur(coord, outputSize);
    textureStore(postProcessOutput, coord, vec4f(max(wideDebug.rgb, vec3f(0.0)), source.a));
  } else {
    textureStore(postProcessOutput, coord, vec4f(finalColor, source.a));
  }
}
