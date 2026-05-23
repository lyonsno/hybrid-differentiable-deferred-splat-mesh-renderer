import { decodePng } from "./png-analysis.mjs";

const OBSERVATION_IDENTITY_FIELDS = [
  "branch",
  "commit",
  "url",
  "viewport",
  "renderer",
  "arenaBackend",
  "tileSizePx",
  "maxRefsPerTile",
  "witnessView",
];

export const TRACE_CANVAS_PARITY_OWNER = "trace-canvas-parity";
export const TRACE_CANVAS_PARITY_KINDS = Object.freeze({
  match: "trace-canvas-match",
  mismatch: "trace-canvas-mismatch",
  observationMismatch: "observation-mismatch",
  calibrationBlocked: "trace-canvas-calibration-blocked",
});

export function buildTraceCanvasParityEvidence({
  pageEvidence = {},
  pngBuffer,
  image,
  url = "",
  viewport = {},
  tolerance = { maxChannelDelta: 3, channelOrder: "rgba8" },
} = {}) {
  const decoded = image ?? (pngBuffer ? decodePng(pngBuffer) : null);
  const finalRows = normalizeFinalColorRows(pageEvidence?.tileLocal?.perPixelFinalColorAccumulation);
  const liveCompositorInput = normalizeLiveCompositorInputReadback(pageEvidence?.tileLocal?.compositorInputReadback);
  const canvas = pageEvidence?.canvas && typeof pageEvidence.canvas === "object" ? pageEvidence.canvas : {};
  if (!decoded || finalRows.length === 0 || !Number.isFinite(Number(canvas.width)) || !Number.isFinite(Number(canvas.height))) {
    return undefined;
  }

  const sampleScale = {
    x: decoded.width / Math.max(1, Number(canvas.width)),
    y: decoded.height / Math.max(1, Number(canvas.height)),
  };
  const maxChannelDelta = finiteNumber(tolerance.maxChannelDelta) ?? 3;
  const channelOrder = stringValue(tolerance.channelOrder) || "rgba8";
  const useLiveCompositorPrediction =
    liveCompositorInput.status === "present" &&
    finalRows.every((row) => liveCompositorInput.anchorsById.get(row.id)?.liveCompositorRgba8.length === 4);
  const predictionSource = useLiveCompositorPrediction ? "live-compositor-input-readback" : "cpu-final-trace";
  const anchors = finalRows.map((row) => {
    const sampleX = clampInteger(Math.floor((row.x + 0.5) * sampleScale.x), 0, decoded.width - 1);
    const sampleY = clampInteger(Math.floor((row.y + 0.5) * sampleScale.y), 0, decoded.height - 1);
    const sampledRgba8 = readRgba8(decoded, sampleX, sampleY);
    const cpuFinalTraceRgba8 = rgbaFloatTo8(row.outputColor);
    const liveRow = liveCompositorInput.anchorsById.get(row.id);
    const liveCompositorRgba8 = liveRow?.liveCompositorRgba8 ?? [];
    const predictedRgba8 = useLiveCompositorPrediction ? liveCompositorRgba8 : cpuFinalTraceRgba8;
    const deltaRgba8 = sampledRgba8.map((channel, index) => channel - predictedRgba8[index]);
    const maxDelta = maxChannelDeltaFromDelta(deltaRgba8);
    const traceModelVsLiveDeltaRgba8 = liveCompositorRgba8.length === 4
      ? liveCompositorRgba8.map((channel, index) => channel - cpuFinalTraceRgba8[index])
      : [];
    return removeUndefinedProperties({
      id: row.id,
      anchorPixel: { x: row.x, y: row.y },
      samplePixel: { x: sampleX, y: sampleY },
      predictedRgba8,
      sampledRgba8,
      deltaRgba8,
      maxDelta,
      status: maxDelta <= maxChannelDelta ? "match" : "mismatch",
      predictionSource,
      cpuFinalTraceRgba8: useLiveCompositorPrediction ? cpuFinalTraceRgba8 : undefined,
      liveCompositorRgba8: liveCompositorRgba8.length === 4 ? liveCompositorRgba8 : undefined,
      traceModelVsLiveDeltaRgba8: traceModelVsLiveDeltaRgba8.length === 4 ? traceModelVsLiveDeltaRgba8 : undefined,
      traceModelVsLiveMaxDelta: traceModelVsLiveDeltaRgba8.length === 4
        ? maxChannelDeltaFromDelta(traceModelVsLiveDeltaRgba8)
        : undefined,
      liveCompositorInput: liveRow
        ? {
            refLimit: liveRow.refLimit,
            header: liveRow.header,
          }
        : undefined,
    });
  });
  const traceModelVsLive = summarizeTraceModelVsLive(anchors, maxChannelDelta);

  const identity = observationIdentity({ pageEvidence, url, viewport });
  return {
    observationId: observationIdFromIdentity(identity),
    comparisonClass: useLiveCompositorPrediction
      ? "exact-route-live-compositor-input-vs-canvas"
      : "exact-route-trace-final-vs-canvas",
    predictionSource,
    liveCompositorInputReadbackStatus: liveCompositorInput.status,
    traceModelVsLive,
    expectedObservationIdentity: identity,
    actualObservationIdentity: identity,
    identityDiffs: [],
    sampleScale,
    tolerance: {
      maxChannelDelta,
      channelOrder,
    },
    anchors,
  };
}

export function classifyTraceCanvasParityWitness(traceCanvasParity = {}) {
  const comparisonClass = stringValue(traceCanvasParity.comparisonClass);
  const predictionSource = stringValue(traceCanvasParity.predictionSource);
  const liveCompositorInputReadbackStatus = stringValue(traceCanvasParity.liveCompositorInputReadbackStatus);
  const traceModelVsLive = normalizeTraceModelVsLive(traceCanvasParity.traceModelVsLive);
  const observationId = stringValue(traceCanvasParity.observationId);
  const expectedObservationIdentity = normalizeObservationIdentity(traceCanvasParity.expectedObservationIdentity);
  const actualObservationIdentity = normalizeObservationIdentity(traceCanvasParity.actualObservationIdentity);
  const identityDiffs = normalizeIdentityDiffs(
    traceCanvasParity.identityDiffs,
    expectedObservationIdentity,
    actualObservationIdentity,
  );
  const sampleScale = normalizeSampleScale(traceCanvasParity.sampleScale);
  const tolerance = normalizeTolerance(traceCanvasParity.tolerance);
  const anchors = normalizeAnchors(traceCanvasParity.anchors, tolerance.maxChannelDelta);
  const blockedReasons = [];

  if (!observationId) blockedReasons.push("missing observationId");
  if (!comparisonClass) blockedReasons.push("missing comparisonClass");
  if (Object.keys(expectedObservationIdentity).length === 0) blockedReasons.push("missing expectedObservationIdentity");
  if (Object.keys(actualObservationIdentity).length === 0) blockedReasons.push("missing actualObservationIdentity");
  if (!Number.isFinite(tolerance.maxChannelDelta)) blockedReasons.push("missing tolerance.maxChannelDelta");
  if (anchors.length === 0) blockedReasons.push("missing anchors");

  if (blockedReasons.length > 0) {
    return {
      status: TRACE_CANVAS_PARITY_KINDS.calibrationBlocked,
      kind: TRACE_CANVAS_PARITY_KINDS.calibrationBlocked,
      owner: TRACE_CANVAS_PARITY_OWNER,
      severity: "blocked",
      summary: `Trace/canvas parity calibration is blocked: ${blockedReasons.join("; ")}.`,
      evidence: {
        observationId,
        comparisonClass,
        predictionSource,
        liveCompositorInputReadbackStatus,
        traceModelVsLive,
        expectedObservationIdentity,
        actualObservationIdentity,
        identityDiffs,
        sampleScale,
        tolerance,
        anchors,
        blockedReasons,
      },
    };
  }

  if (identityDiffs.length > 0) {
    return {
      status: TRACE_CANVAS_PARITY_KINDS.observationMismatch,
      kind: TRACE_CANVAS_PARITY_KINDS.observationMismatch,
      owner: TRACE_CANVAS_PARITY_OWNER,
      severity: "blocked",
      summary: `Trace/canvas observation identity mismatch prevents parity comparison: ${identityDiffs.join("; ")}.`,
      evidence: {
        observationId,
        comparisonClass,
        predictionSource,
        liveCompositorInputReadbackStatus,
        traceModelVsLive,
        expectedObservationIdentity,
        actualObservationIdentity,
        identityDiffs,
        sampleScale,
        tolerance,
        anchors,
        blockedReasons: [],
      },
    };
  }

  const mismatchAnchors = anchors.filter((anchor) => anchor.status === "mismatch");
  const maxDelta = mismatchAnchors.reduce((max, anchor) => Math.max(max, anchor.maxDelta), 0);
  const status = mismatchAnchors.length === 0 ? TRACE_CANVAS_PARITY_KINDS.match : TRACE_CANVAS_PARITY_KINDS.mismatch;

  return {
    status,
    kind: status,
    owner: TRACE_CANVAS_PARITY_OWNER,
    severity: status === TRACE_CANVAS_PARITY_KINDS.match ? "pass" : "blocked",
    summary:
      status === TRACE_CANVAS_PARITY_KINDS.match
        ? `Canvas parity matched ${comparisonClass} for ${observationId} across ${anchors.length} anchors.`
        : `Canvas parity mismatch for ${comparisonClass} at ${observationId}: ${mismatchAnchors.length}/${anchors.length} anchors exceeded max channel delta ${tolerance.maxChannelDelta}; max delta ${maxDelta}.`,
    evidence: {
      observationId,
      comparisonClass,
      predictionSource,
      liveCompositorInputReadbackStatus,
      traceModelVsLive,
      expectedObservationIdentity,
      actualObservationIdentity,
      identityDiffs: [],
      sampleScale,
      tolerance,
      anchors,
      mismatchAnchors,
      matchedAnchors: anchors.filter((anchor) => anchor.status === "match"),
      maxDelta,
      blockedReasons: [],
    },
  };
}

function normalizeObservationIdentity(identity = {}) {
  const normalized = {};
  for (const field of OBSERVATION_IDENTITY_FIELDS) {
    if (identity[field] !== undefined) {
      normalized[field] = identity[field];
    }
  }
  return normalized;
}

function normalizeFinalColorRows(rows) {
  if (!Array.isArray(rows)) {
    return [];
  }
  return rows
    .map((row) => {
      const record = row?.traceRecord && typeof row.traceRecord === "object" ? row.traceRecord : row;
      const anchorPixel = row?.anchorPixel && typeof row.anchorPixel === "object"
        ? row.anchorPixel
        : record?.anchorPixel;
      const outputColor = record?.finalColorAccumulation?.outputColor;
      return {
        id: stringValue(anchorPixel?.id),
        x: finiteNumber(anchorPixel?.x),
        y: finiteNumber(anchorPixel?.y),
        outputColor: Array.isArray(outputColor) ? outputColor : [],
      };
    })
    .filter((row) =>
      row.id.length > 0 &&
      Number.isFinite(row.x) &&
      Number.isFinite(row.y) &&
      row.outputColor.length === 4
    );
}

function normalizeLiveCompositorInputReadback(readback = {}) {
  const anchorsById = new Map();
  const anchors = Array.isArray(readback?.anchors) ? readback.anchors : [];
  for (const anchor of anchors) {
    const id = stringValue(anchor?.id);
    const liveCompositorRgba8 = normalizeRgba8(anchor?.liveCompositorRgba8);
    if (!id || liveCompositorRgba8.length !== 4) {
      continue;
    }
    anchorsById.set(id, {
      id,
      liveCompositorRgba8,
      refLimit: finiteNumber(anchor?.refLimit),
      header: normalizeCompositorHeader(anchor?.header),
    });
  }
  return {
    status: stringValue(readback?.status),
    anchorsById,
  };
}

function normalizeCompositorHeader(header = {}) {
  if (!header || typeof header !== "object") {
    return undefined;
  }
  return removeUndefinedProperties({
    firstRefIndex: finiteNumber(header.firstRefIndex),
    refCount: finiteNumber(header.refCount),
    projectedCount: finiteNumber(header.projectedCount),
    droppedCount: finiteNumber(header.droppedCount),
  });
}

function summarizeTraceModelVsLive(anchors, maxChannelDelta) {
  const comparedAnchors = anchors.filter((anchor) => Array.isArray(anchor.traceModelVsLiveDeltaRgba8));
  if (comparedAnchors.length === 0) {
    return {
      status: "not-compared",
      mismatchAnchors: [],
      maxDelta: 0,
    };
  }
  const mismatchAnchors = comparedAnchors
    .filter((anchor) => anchor.traceModelVsLiveMaxDelta > maxChannelDelta)
    .map((anchor) => anchor.id);
  return {
    status: mismatchAnchors.length > 0 ? "mismatch" : "match",
    mismatchAnchors,
    maxDelta: comparedAnchors.reduce(
      (max, anchor) => Math.max(max, finiteNumber(anchor.traceModelVsLiveMaxDelta) ?? 0),
      0,
    ),
  };
}

function normalizeTraceModelVsLive(value = {}) {
  const mismatchAnchors = Array.isArray(value?.mismatchAnchors)
    ? value.mismatchAnchors.map((anchor) => stringValue(anchor)).filter(Boolean)
    : [];
  return {
    status: stringValue(value?.status),
    mismatchAnchors,
    maxDelta: finiteNumber(value?.maxDelta) ?? 0,
  };
}

function observationIdentity({ pageEvidence = {}, url = "", viewport = {} } = {}) {
  const parsed = parseUrlParams(url);
  const tileLocal = pageEvidence.tileLocal && typeof pageEvidence.tileLocal === "object" ? pageEvidence.tileLocal : {};
  const budget = tileLocal.budget && typeof tileLocal.budget === "object" ? tileLocal.budget : {};
  return normalizeObservationIdentity({
    url,
    viewport: {
      width: finiteNumber(viewport.width) ?? finiteNumber(pageEvidence.canvas?.width),
      height: finiteNumber(viewport.height) ?? finiteNumber(pageEvidence.canvas?.height),
    },
    renderer: stringValue(pageEvidence.rendererLabel) || parsed.renderer,
    arenaBackend: stringValue(pageEvidence.arenaRuntime?.effectiveArenaBackend) || parsed.arenaBackend,
    tileSizePx: finiteNumber(budget.tileSizePx) ?? finiteNumber(parsed.tileSizePx),
    maxRefsPerTile: finiteNumber(budget.maxRefsPerTile) ?? finiteNumber(parsed.maxRefsPerTile),
    witnessView: parsed.witnessView,
  });
}

function observationIdFromIdentity(identity) {
  const viewport = identity.viewport && typeof identity.viewport === "object"
    ? `${identity.viewport.width ?? "?"}x${identity.viewport.height ?? "?"}`
    : "unknown-viewport";
  return [
    "exact-route",
    viewport,
    identity.witnessView || "unknown-view",
    identity.renderer || "unknown-renderer",
    identity.arenaBackend || "unknown-arena",
    `${identity.tileSizePx ?? "?"}x${identity.maxRefsPerTile ?? "?"}`,
  ].join(":");
}

function parseUrlParams(url) {
  try {
    const parsed = new URL(url);
    return {
      renderer: parsed.searchParams.get("renderer") ?? "",
      arenaBackend: parsed.searchParams.get("arenaBackend") ?? "",
      tileSizePx: parsed.searchParams.get("tileSizePx") ?? "",
      maxRefsPerTile: parsed.searchParams.get("maxRefsPerTile") ?? "",
      witnessView: parsed.searchParams.get("witnessView") ?? "",
    };
  } catch {
    return {};
  }
}

function rgbaFloatTo8(value) {
  return [0, 1, 2, 3].map((index) =>
    clampInteger(Math.round(Math.max(0, Math.min(1, finiteNumber(value[index]) ?? 0)) * 255), 0, 255)
  );
}

function readRgba8(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [
    image.rgba[offset],
    image.rgba[offset + 1],
    image.rgba[offset + 2],
    image.rgba[offset + 3],
  ];
}

function clampInteger(value, min, max) {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.trunc(value)));
}

function normalizeIdentityDiffs(identityDiffs, expectedObservationIdentity, actualObservationIdentity) {
  if (Array.isArray(identityDiffs) && identityDiffs.length > 0) {
    return identityDiffs.map((entry) => String(entry));
  }

  const diffs = [];
  for (const field of OBSERVATION_IDENTITY_FIELDS) {
    const expected = expectedObservationIdentity[field];
    const actual = actualObservationIdentity[field];
    if (!deepEqual(expected, actual)) {
      diffs.push(`${field}: expected ${stringifyValue(expected)}, saw ${stringifyValue(actual)}`);
    }
  }
  return diffs;
}

function normalizeSampleScale(sampleScale = {}) {
  return {
    x: finiteNumber(sampleScale.x) ?? 1,
    y: finiteNumber(sampleScale.y) ?? 1,
  };
}

function normalizeTolerance(tolerance = {}) {
  return {
    maxChannelDelta: finiteNumber(tolerance.maxChannelDelta),
    channelOrder: stringValue(tolerance.channelOrder) || "rgba8",
  };
}

function normalizeAnchors(anchors = [], maxChannelDelta = Number.NaN) {
  if (!Array.isArray(anchors)) {
    return [];
  }
  return anchors
    .map((anchor) => {
      const predictedRgba8 = normalizeRgba8(anchor?.predictedRgba8);
      const sampledRgba8 = normalizeRgba8(anchor?.sampledRgba8);
      const deltaRgba8 = normalizeDelta(anchor?.deltaRgba8, predictedRgba8, sampledRgba8);
      const maxDelta = finiteNumber(anchor?.maxDelta) ?? maxChannelDeltaFromDelta(deltaRgba8);
      return removeUndefinedProperties({
        id: stringValue(anchor?.id),
        predictedRgba8,
        sampledRgba8,
        deltaRgba8,
        maxDelta,
        status: maxDelta <= maxChannelDelta ? "match" : "mismatch",
        predictionSource: stringValue(anchor?.predictionSource) || undefined,
        cpuFinalTraceRgba8: normalizeOptionalRgba8(anchor?.cpuFinalTraceRgba8),
        liveCompositorRgba8: normalizeOptionalRgba8(anchor?.liveCompositorRgba8),
        traceModelVsLiveDeltaRgba8: normalizeOptionalDelta(anchor?.traceModelVsLiveDeltaRgba8),
        traceModelVsLiveMaxDelta: finiteNumber(anchor?.traceModelVsLiveMaxDelta),
        liveCompositorInput: normalizeLiveCompositorInputSummary(anchor?.liveCompositorInput),
      });
    })
    .filter((anchor) => anchor.id.length > 0);
}

function normalizeRgba8(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return [];
  }
  return value.map((channel) => Math.max(0, Math.min(255, Math.trunc(finiteNumber(channel) ?? 0))));
}

function normalizeOptionalRgba8(value) {
  const normalized = normalizeRgba8(value);
  return normalized.length === 4 ? normalized : undefined;
}

function normalizeOptionalDelta(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return undefined;
  }
  return value.map((channel) => Math.trunc(finiteNumber(channel) ?? 0));
}

function normalizeLiveCompositorInputSummary(input = {}) {
  if (!input || typeof input !== "object") {
    return undefined;
  }
  return removeUndefinedProperties({
    refLimit: finiteNumber(input.refLimit),
    header: normalizeCompositorHeader(input.header),
  });
}

function normalizeDelta(deltaRgba8, predictedRgba8, sampledRgba8) {
  if (Array.isArray(deltaRgba8) && deltaRgba8.length === 4) {
    return deltaRgba8.map((channel) => Math.trunc(finiteNumber(channel) ?? 0));
  }
  if (predictedRgba8.length !== 4 || sampledRgba8.length !== 4) {
    return [];
  }
  return sampledRgba8.map((channel, index) => channel - predictedRgba8[index]);
}

function maxChannelDeltaFromDelta(deltaRgba8) {
  if (!Array.isArray(deltaRgba8) || deltaRgba8.length === 0) {
    return 0;
  }
  return deltaRgba8.reduce((max, channel) => Math.max(max, Math.abs(channel)), 0);
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function stringifyValue(value) {
  return typeof value === "string" ? value : JSON.stringify(value);
}

function deepEqual(left, right) {
  return JSON.stringify(left) === JSON.stringify(right);
}

function removeUndefinedProperties(value) {
  return Object.fromEntries(
    Object.entries(value).filter(([, entry]) => entry !== undefined)
  );
}
