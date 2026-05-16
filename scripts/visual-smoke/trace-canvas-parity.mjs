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

export function classifyTraceCanvasParityWitness(traceCanvasParity = {}) {
  const comparisonClass = stringValue(traceCanvasParity.comparisonClass);
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
        ? `Trace/canvas parity matched for ${observationId} across ${anchors.length} anchors.`
        : `Trace/canvas parity mismatch for ${observationId}: ${mismatchAnchors.length}/${anchors.length} anchors exceeded max channel delta ${tolerance.maxChannelDelta}; max delta ${maxDelta}.`,
    evidence: {
      observationId,
      comparisonClass,
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
      return {
        id: stringValue(anchor?.id),
        predictedRgba8,
        sampledRgba8,
        deltaRgba8,
        maxDelta,
        status: maxDelta <= maxChannelDelta ? "match" : "mismatch",
      };
    })
    .filter((anchor) => anchor.id.length > 0);
}

function normalizeRgba8(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return [];
  }
  return value.map((channel) => Math.max(0, Math.min(255, Math.trunc(finiteNumber(channel) ?? 0))));
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
