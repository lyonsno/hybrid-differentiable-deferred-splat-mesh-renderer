const DEFAULT_TOLERANCE = 1 / 255;
const DEFAULT_OUTPUT_FORMAT = Object.freeze({
  textureFormat: "rgba16float",
  sampleSpace: "linear-float",
  transferStage: "tile-local-output-texture-before-presentation",
});

export function compareTraceToRuntimeFinalColor({
  traceAccumulation = [],
  runtimeFinalColor = [],
  tolerance = DEFAULT_TOLERANCE,
} = {}) {
  const runtimeByAnchorId = new Map(normalizeRuntimeRows(runtimeFinalColor).map((row) => [row.anchorId, row]));
  const rows = normalizeTraceRows(traceAccumulation).map((trace) => {
    const runtime = runtimeByAnchorId.get(trace.anchorId) ?? null;
    return compareTraceRuntimeRow(trace, runtime, tolerance);
  });

  let classification = "runtime-final-color-matches-trace";
  if (rows.length === 0 || rows.some((row) => row.status === "runtime-final-color-missing")) {
    classification = "runtime-final-color-underinstrumented";
  } else if (rows.some((row) => row.status === "trace-runtime-final-color-divergence")) {
    classification = "trace-runtime-final-color-divergence";
  }

  return {
    classification,
    tolerance,
    rows,
  };
}

function compareTraceRuntimeRow(trace, runtime, tolerance) {
  const traceRgba = trace.outputColor;
  const traceRgba8 = rgba8(traceRgba);
  const base = {
    anchorId: trace.anchorId,
    anchorPixel: trace.anchorPixel,
    traceRgba,
    traceRgba8,
    finalStepCount: trace.finalStepCount,
    firstStep: trace.firstStep,
    lastStep: trace.lastStep,
    skipReasons: trace.skipReasons,
  };
  if (!runtime) {
    return {
      ...base,
      status: "runtime-final-color-missing",
      runtimeRgba: null,
      runtimeRgba8: null,
      maxChannelDelta: null,
      maxChannelDelta8: null,
      runtimeOutputFormat: null,
      blendReason: "runtime final-color output was not sampled before presentation",
      clampReason: null,
    };
  }

  const runtimeRgba = runtime.rgba;
  const maxChannelDelta = maxDelta(traceRgba, runtimeRgba);
  const maxChannelDelta8 = maxDelta(rgba8(traceRgba), rgba8(runtimeRgba));
  return {
    ...base,
    status: maxChannelDelta <= tolerance
      ? "runtime-final-color-match"
      : "trace-runtime-final-color-divergence",
    runtimeRgba,
    runtimeRgba8: rgba8(runtimeRgba),
    maxChannelDelta,
    maxChannelDelta8,
    runtimeOutputFormat: {
      textureFormat: runtime.textureFormat,
      sampleSpace: runtime.sampleSpace,
      transferStage: runtime.transferStage,
    },
    blendReason: "runtime-output-read-before-presenter-blend",
    clampReason: "half-float output decoded and clamped to normalized RGBA",
  };
}

function normalizeTraceRows(traceAccumulation) {
  if (!Array.isArray(traceAccumulation)) {
    return [];
  }
  return traceAccumulation
    .map((row) => {
      const traceRecord = row?.traceRecord ?? row;
      const anchorPixel = traceRecord?.anchorPixel ?? row?.anchorPixel ?? {};
      const accumulation = traceRecord?.finalColorAccumulation ?? row?.finalColorAccumulation ?? {};
      const steps = Array.isArray(accumulation.steps) ? accumulation.steps : [];
      const outputColor = normalizeRgba(accumulation.outputColor);
      const anchorId = typeof anchorPixel.id === "string" ? anchorPixel.id : "";
      if (!anchorId || !outputColor) {
        return null;
      }
      return {
        anchorId,
        anchorPixel: {
          id: anchorId,
          x: finiteOrNull(anchorPixel.x),
          y: finiteOrNull(anchorPixel.y),
        },
        outputColor,
        finalStepCount: steps.length,
        firstStep: summarizeStep(steps[0]),
        lastStep: summarizeStep(steps[steps.length - 1]),
        skipReasons: steps
          .filter((step) => step?.accumulationStatus && step.accumulationStatus !== "accumulated")
          .map((step) => ({
            splatIndex: finiteOrNull(step.splatIndex),
            originalId: finiteOrNull(step.originalId),
            accumulationStatus: String(step.accumulationStatus),
          })),
      };
    })
    .filter(Boolean);
}

function normalizeRuntimeRows(runtimeFinalColor) {
  if (!Array.isArray(runtimeFinalColor)) {
    return [];
  }
  return runtimeFinalColor
    .map((row) => {
      const anchorId = typeof row?.anchorId === "string"
        ? row.anchorId
        : typeof row?.id === "string"
          ? row.id
          : "";
      const rgba = normalizeRgba(row?.rgba);
      if (!anchorId || !rgba) {
        return null;
      }
      return {
        anchorId,
        rgba,
        textureFormat: row.textureFormat ?? DEFAULT_OUTPUT_FORMAT.textureFormat,
        sampleSpace: row.sampleSpace ?? DEFAULT_OUTPUT_FORMAT.sampleSpace,
        transferStage: row.transferStage ?? DEFAULT_OUTPUT_FORMAT.transferStage,
      };
    })
    .filter(Boolean);
}

function summarizeStep(step) {
  if (!step || typeof step !== "object") {
    return null;
  }
  return {
    splatIndex: finiteOrNull(step.splatIndex),
    originalId: finiteOrNull(step.originalId),
    coverageWeight: finiteOrNull(step.coverageWeight),
    tileCoverageWeight: finiteOrNull(step.tileCoverageWeight),
    opacity: finiteOrNull(step.opacity),
    coverageAlpha: finiteOrNull(step.coverageAlpha),
    transmittanceBefore: finiteOrNull(step.transmittanceBefore),
    transmittanceAfter: finiteOrNull(step.transmittanceAfter),
    sourceColor: normalizeRgb(step.sourceColor),
    contributionColor: normalizeRgb(step.contributionColor),
    runningColor: normalizeRgb(step.runningColor),
    accumulationStatus: typeof step.accumulationStatus === "string" ? step.accumulationStatus : null,
  };
}

function normalizeRgba(value) {
  if (!Array.isArray(value) || value.length < 4) {
    return null;
  }
  const rgba = value.slice(0, 4).map((channel) => Number(channel));
  return rgba.every(Number.isFinite) ? rgba.map((channel) => clamp(channel, 0, 1)) : null;
}

function normalizeRgb(value) {
  if (!Array.isArray(value) || value.length < 3) {
    return null;
  }
  const rgb = value.slice(0, 3).map((channel) => Number(channel));
  return rgb.every(Number.isFinite) ? rgb : null;
}

function rgba8(rgba) {
  return rgba.map((channel) => Math.round(clamp(channel, 0, 1) * 255));
}

function maxDelta(left, right) {
  let max = 0;
  for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
    max = Math.max(max, Math.abs(left[index] - right[index]));
  }
  return Number(max.toFixed(12));
}

function finiteOrNull(value) {
  return Number.isFinite(value) ? value : null;
}

function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value));
}
