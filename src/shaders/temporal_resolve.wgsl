@group(0) @binding(0) var currentFrame: texture_2d<f32>;
@group(0) @binding(1) var historyFrame: texture_2d<f32>;
@group(0) @binding(2) var temporalOutput: texture_storage_2d<rgba16float, write>;

struct TemporalResolveSettings {
  historyFrameCount: u32,
  maxHistoryFrames: u32,
  debugView: u32,
  _pad0: u32,
};

@group(0) @binding(3) var<uniform> settings: TemporalResolveSettings;

const DEBUG_VIEW_FINAL = 0u;
const DEBUG_VIEW_HISTORY_WEIGHT = 1u;
const DEBUG_VIEW_DIFFERENCE = 2u;

@compute @workgroup_size(8, 8, 1)
fn temporal_resolve(@builtin(global_invocation_id) globalId: vec3u) {
  let outputSize = textureDimensions(temporalOutput);
  if (globalId.x >= outputSize.x || globalId.y >= outputSize.y) {
    return;
  }

  let coord = vec2i(globalId.xy);
  let current = textureLoad(currentFrame, coord, 0);
  let history = textureLoad(historyFrame, coord, 0);
  let safeMaxFrames = max(settings.maxHistoryFrames, 1u);
  let clampedHistoryCount = min(settings.historyFrameCount, safeMaxFrames - 1u);
  let totalWeight = f32(clampedHistoryCount + 1u);
  let historyWeight = f32(clampedHistoryCount) / totalWeight;
  let currentWeight = 1.0 / totalWeight;
  let resolved = select(
    current,
    vec4f(history.rgb * historyWeight + current.rgb * currentWeight, current.a),
    clampedHistoryCount > 0u
  );

  if (settings.debugView == DEBUG_VIEW_HISTORY_WEIGHT) {
    let weight = f32(clampedHistoryCount + 1u) / f32(safeMaxFrames);
    textureStore(temporalOutput, coord, vec4f(vec3f(weight), current.a));
  } else if (settings.debugView == DEBUG_VIEW_DIFFERENCE) {
    textureStore(temporalOutput, coord, vec4f(clamp(abs(resolved.rgb - current.rgb) * 8.0, vec3f(0.0), vec3f(1.0)), current.a));
  } else {
    textureStore(temporalOutput, coord, resolved);
  }
}
