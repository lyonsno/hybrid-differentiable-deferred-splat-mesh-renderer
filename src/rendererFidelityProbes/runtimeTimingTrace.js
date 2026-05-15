export function normalizeRuntimeTimingEvidence(runtimeTiming = {}, statsText = "") {
  const parsed = parseRuntimeTimingStats(statsText);
  const normalized = {};

  assignBoolean(normalized, "timestampsSupported", booleanValue(runtimeTiming.timestampsSupported, parsed.timestampsSupported));
  assignNumeric(normalized, "rafCadenceMs", finiteNumber(runtimeTiming.rafCadenceMs, parsed.rafCadenceMs));
  assignNumeric(normalized, "rafCadenceHz", finiteNumber(runtimeTiming.rafCadenceHz, parsed.rafCadenceHz));
  assignNumeric(normalized, "cameraInteractionMs", finiteNumber(runtimeTiming.cameraInteractionMs, parsed.cameraInteractionMs));
  assignNumeric(normalized, "renderSubmitMs", finiteNumber(runtimeTiming.renderSubmitMs, parsed.renderSubmitMs));
  assignNumeric(normalized, "gpuRenderPassMs", finiteNumber(runtimeTiming.gpuRenderPassMs, parsed.gpuRenderPassMs));
  assignNumeric(
    normalized,
    "gpuTimestampReadbackMs",
    finiteNumber(runtimeTiming.gpuTimestampReadbackMs, parsed.gpuTimestampReadbackMs)
  );
  assignNumeric(normalized, "overlayUpdateMs", finiteNumber(runtimeTiming.overlayUpdateMs, parsed.overlayUpdateMs));
  assignText(normalized, "rebuildState", textValue(runtimeTiming.rebuildState, parsed.rebuildState));

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

export function parseRuntimeTimingStats(statsText = "") {
  const text = String(statsText ?? "");
  if (!text.includes("timing:")) {
    return {};
  }

  const result = {};
  const rafMatch = /\btiming:\s*rAF\s+([\d.]+)ms(?:\s+\(([\d.]+)fps\))?/i.exec(text);
  const cameraMatch = /\bcamera\s+([\d.]+)ms/i.exec(text);
  const submitMatch = /\bsubmit\s+([\d.]+)ms/i.exec(text);
  const gpuRenderMatch = /\bgpu render\s+([\d.]+)ms/i.exec(text);
  const gpuReadbackMatch = /\bgpu readback\s+([\d.]+)ms/i.exec(text);
  const overlayMatch = /\boverlay\s+([\d.]+)ms/i.exec(text);
  const rebuildMatch = /\brebuild\s+(rebuild|reuse)\b/i.exec(text);

  assignNumeric(result, "rafCadenceMs", rafMatch ? Number(rafMatch[1]) : undefined);
  assignNumeric(result, "rafCadenceHz", rafMatch && rafMatch[2] ? Number(rafMatch[2]) : undefined);
  assignNumeric(result, "cameraInteractionMs", cameraMatch ? Number(cameraMatch[1]) : undefined);
  assignNumeric(result, "renderSubmitMs", submitMatch ? Number(submitMatch[1]) : undefined);
  assignNumeric(result, "gpuRenderPassMs", gpuRenderMatch ? Number(gpuRenderMatch[1]) : undefined);
  assignNumeric(result, "gpuTimestampReadbackMs", gpuReadbackMatch ? Number(gpuReadbackMatch[1]) : undefined);
  assignNumeric(result, "overlayUpdateMs", overlayMatch ? Number(overlayMatch[1]) : undefined);
  assignText(result, "rebuildState", rebuildMatch ? rebuildMatch[1] : undefined);
  return result;
}

function assignNumeric(target, key, value) {
  if (Number.isFinite(value)) {
    target[key] = Number(value);
  }
}

function assignText(target, key, value) {
  if (typeof value === "string" && value.length > 0) {
    target[key] = value;
  }
}

function assignBoolean(target, key, value) {
  if (typeof value === "boolean") {
    target[key] = value;
  }
}

function finiteNumber(...candidates) {
  for (const candidate of candidates) {
    const number = Number(candidate);
    if (Number.isFinite(number)) {
      return number;
    }
  }
  return undefined;
}

function booleanValue(...candidates) {
  for (const candidate of candidates) {
    if (candidate === true) return true;
    if (candidate === false) return false;
  }
  return undefined;
}

function textValue(...candidates) {
  for (const candidate of candidates) {
    if (typeof candidate === "string" && candidate.length > 0) {
      return candidate;
    }
  }
  return undefined;
}
