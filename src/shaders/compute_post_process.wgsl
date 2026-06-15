@group(0) @binding(0) var postProcessInput: texture_2d<f32>;
@group(0) @binding(1) var postProcessOutput: texture_storage_2d<rgba16float, write>;
struct PostProcessSettings {
  enabled: u32,
  fxaaEnabled: u32,
  casEnabled: u32,
  sampleRadius: u32,
  casSharpness: f32,
};
@group(0) @binding(2) var<uniform> settings: PostProcessSettings;

const FXAA_EDGE_THRESHOLD = 0.0312;
const FXAA_EDGE_THRESHOLD_MIN = 0.00625;

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

fn fxaa_filter(coord: vec2i, size: vec2u) -> vec3f {
  let center = load_rgb(coord, size);
  let radius = i32(clamp(settings.sampleRadius, 1u, 4u));
  let north = load_rgb(coord + vec2i(0, -radius), size);
  let south = load_rgb(coord + vec2i(0, radius), size);
  let west = load_rgb(coord + vec2i(-radius, 0), size);
  let east = load_rgb(coord + vec2i(radius, 0), size);

  let centerLuma = luma(center);
  let northLuma = luma(north);
  let southLuma = luma(south);
  let westLuma = luma(west);
  let eastLuma = luma(east);
  let minLuma = min(centerLuma, min(min(northLuma, southLuma), min(westLuma, eastLuma)));
  let maxLuma = max(centerLuma, max(max(northLuma, southLuma), max(westLuma, eastLuma)));
  let contrast = maxLuma - minLuma;
  let edgeThreshold = max(FXAA_EDGE_THRESHOLD_MIN, maxLuma * FXAA_EDGE_THRESHOLD);
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
  let blendAmount = clamp(contrast / max(maxLuma, 0.0001), 0.0, 1.0) * 0.45;
  return mix(center, axisBlend, blendAmount);
}

fn cas_sharpen(coord: vec2i, size: vec2u, color: vec3f) -> vec3f {
  let radius = i32(clamp(settings.sampleRadius, 1u, 4u));
  let north = load_rgb(coord + vec2i(0, -radius), size);
  let south = load_rgb(coord + vec2i(0, radius), size);
  let west = load_rgb(coord + vec2i(-radius, 0), size);
  let east = load_rgb(coord + vec2i(radius, 0), size);
  let lowPass = (north + south + west + east) * 0.25;
  let localMin = min(color, min(min(north, south), min(west, east)));
  let localMax = max(color, max(max(north, south), max(west, east)));
  let sharpened = color + (color - lowPass) * settings.casSharpness;
  return clamp(sharpened, localMin, localMax);
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
  let fxaaColor = select(source.rgb, fxaa_filter(coord, outputSize), settings.fxaaEnabled != 0u);
  let casColor = select(fxaaColor, cas_sharpen(coord, outputSize, fxaaColor), settings.casEnabled != 0u);
  textureStore(postProcessOutput, coord, vec4f(max(casColor, vec3f(0.0)), source.a));
}
