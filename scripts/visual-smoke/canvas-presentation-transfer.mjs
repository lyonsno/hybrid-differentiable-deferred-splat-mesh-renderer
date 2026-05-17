export const CANVAS_PRESENTATION_TRANSFER_OWNER = "canvas-presentation-transfer";
export const CANVAS_PRESENTATION_TRANSFER_KINDS = Object.freeze({
  transferDivergence: "presentation-transfer-divergence",
  readbackTransform: "canvas-readback-transform",
  cleared: "presentation-cleared",
  underinstrumented: "presentation-underinstrumented",
  narrowerBlocker: "narrower-blocker",
});

const REQUIRED_TRANSFER_EVIDENCE = [
  "runtimeFinalColorRgba8ByAnchor",
  "canvasSampleRgba8ByAnchor",
  "mirroredCanvasSampleRgba8ByAnchor",
  "presentationMetadata",
];

export function classifyCanvasPresentationTransfer({ traceCanvasParity = {}, pageEvidence = {} } = {}) {
  const anchors = normalizeAnchors(traceCanvasParity.anchors);
  const mismatchAnchors = anchors.filter((anchor) => anchor.status === "mismatch" || anchor.maxDelta > tolerance(traceCanvasParity));
  if (anchors.length === 0 || mismatchAnchors.length === 0) {
    return null;
  }

  const presentationTransfer =
    objectValue(pageEvidence.presentationTransfer) ??
    objectValue(pageEvidence.tileLocal?.presentationTransfer) ??
    objectValue(pageEvidence.witness?.canvasPresentationTransfer) ??
    objectValue(pageEvidence.rendererFidelityWitness?.canvasPresentationTransfer) ??
    {};
  const missingEvidence = missingTransferEvidence(presentationTransfer);
  const rejectedTransforms = rejectedSimpleTransforms(mismatchAnchors);

  if (missingEvidence.length > 0) {
    return {
      kind: CANVAS_PRESENTATION_TRANSFER_KINDS.underinstrumented,
      status: CANVAS_PRESENTATION_TRANSFER_KINDS.underinstrumented,
      owner: CANVAS_PRESENTATION_TRANSFER_OWNER,
      severity: "blocked",
      summary:
        "Canvas presentation transfer is underinstrumented: trace/canvas parity mismatches, but the payload lacks paired runtime-final, canvas, mirrored-readback, and presentation metadata needed to isolate presentation/readback transformation.",
      evidence: {
        observationId: stringValue(traceCanvasParity.observationId),
        comparisonClass: stringValue(traceCanvasParity.comparisonClass),
        rejectedTransforms,
        missingEvidence,
        presentationMetadata: objectValue(presentationTransfer.presentationMetadata) ?? null,
        canvas: objectValue(pageEvidence.canvas) ?? null,
        mismatchAnchors: mismatchAnchors.map(({ id, predictedRgba8, sampledRgba8, deltaRgba8, maxDelta }) => ({
          id,
          predictedRgba8,
          sampledRgba8,
          deltaRgba8,
          maxDelta,
        })),
      },
    };
  }

  return classifyPairedTransfer({
    traceCanvasParity,
    anchors,
    presentationTransfer,
    rejectedTransforms,
  });
}

function classifyPairedTransfer({ traceCanvasParity, anchors, presentationTransfer, rejectedTransforms }) {
  const runtimeSamples = normalizeSampleMap(presentationTransfer.runtimeFinalColorRgba8ByAnchor);
  const canvasSamples = normalizeSampleMap(presentationTransfer.canvasSampleRgba8ByAnchor);
  const mirroredSamples = normalizeSampleMap(presentationTransfer.mirroredCanvasSampleRgba8ByAnchor);
  const maxChannelDelta = tolerance(traceCanvasParity);
  const rows = anchors.map((anchor) => {
    const runtime = runtimeSamples.get(anchor.id) ?? [];
    const canvas = canvasSamples.get(anchor.id) ?? anchor.sampledRgba8;
    const mirrored = mirroredSamples.get(anchor.id) ?? [];
    return {
      id: anchor.id,
      runtimeFinalColorRgba8: runtime,
      canvasSampleRgba8: canvas,
      mirroredCanvasSampleRgba8: mirrored,
      runtimeCanvasMaxDelta: maxDelta(runtime, canvas),
      runtimeMirroredMaxDelta: maxDelta(runtime, mirrored),
    };
  });

  const allRuntimeCanvasMatch = rows.every((row) => row.runtimeCanvasMaxDelta <= maxChannelDelta);
  const allRuntimeMirroredMatch = rows.every((row) => row.runtimeMirroredMaxDelta <= maxChannelDelta);
  const kind = allRuntimeCanvasMatch
    ? CANVAS_PRESENTATION_TRANSFER_KINDS.cleared
    : allRuntimeMirroredMatch
      ? CANVAS_PRESENTATION_TRANSFER_KINDS.readbackTransform
      : CANVAS_PRESENTATION_TRANSFER_KINDS.transferDivergence;

  return {
    kind,
    status: kind,
    owner: CANVAS_PRESENTATION_TRANSFER_OWNER,
    severity: kind === CANVAS_PRESENTATION_TRANSFER_KINDS.cleared ? "pass" : "blocked",
    summary:
      kind === CANVAS_PRESENTATION_TRANSFER_KINDS.cleared
        ? "Runtime final color matches canvas samples at the presentation/readback boundary."
        : kind === CANVAS_PRESENTATION_TRANSFER_KINDS.readbackTransform
          ? "Runtime final color matches mirrored canvas samples, so the remaining mismatch is a canvas readback transform."
          : "Runtime final color and canvas samples diverge after paired presentation-transfer evidence.",
    evidence: {
      observationId: stringValue(traceCanvasParity.observationId),
      comparisonClass: stringValue(traceCanvasParity.comparisonClass),
      rejectedTransforms,
      missingEvidence: [],
      presentationMetadata: objectValue(presentationTransfer.presentationMetadata) ?? null,
      anchors: rows,
    },
  };
}

function missingTransferEvidence(presentationTransfer) {
  return REQUIRED_TRANSFER_EVIDENCE.filter((field) => {
    if (field === "presentationMetadata") {
      return !objectValue(presentationTransfer[field]);
    }
    return normalizeSampleMap(presentationTransfer[field]).size === 0;
  });
}

function rejectedSimpleTransforms(anchors) {
  const rejected = [];
  const alphaSealed = anchors.every((anchor) => anchor.predictedRgba8[3] === 255 && anchor.sampledRgba8[3] === 255);
  if (alphaSealed) {
    rejected.push("premultiplied-alpha");
    rejected.push("alpha-blend-over-clear");
  }
  if (anchors.some((anchor) => anchor.maxDelta > 2)) {
    rejected.push("byte-normalization");
  }
  return rejected;
}

function normalizeAnchors(anchors = []) {
  if (!Array.isArray(anchors)) return [];
  return anchors
    .map((anchor) => {
      const predictedRgba8 = normalizeRgba8(anchor?.predictedRgba8);
      const sampledRgba8 = normalizeRgba8(anchor?.sampledRgba8);
      const deltaRgba8 =
        Array.isArray(anchor?.deltaRgba8) && anchor.deltaRgba8.length === 4
          ? anchor.deltaRgba8.map((channel) => Math.trunc(finiteNumber(channel) ?? 0))
          : sampledRgba8.map((channel, index) => channel - predictedRgba8[index]);
      return {
        id: stringValue(anchor?.id),
        predictedRgba8,
        sampledRgba8,
        deltaRgba8,
        maxDelta: finiteNumber(anchor?.maxDelta) ?? maxDeltaFromDelta(deltaRgba8),
        status: stringValue(anchor?.status),
      };
    })
    .filter((anchor) => anchor.id && anchor.predictedRgba8.length === 4 && anchor.sampledRgba8.length === 4);
}

function normalizeSampleMap(value) {
  const map = new Map();
  if (Array.isArray(value)) {
    for (const row of value) {
      const id = stringValue(row?.id ?? row?.anchorId);
      const rgba = normalizeRgba8(row?.rgba8 ?? row?.rgba ?? row?.sampledRgba8 ?? row?.runtimeFinalColorRgba8);
      if (id && rgba.length === 4) map.set(id, rgba);
    }
    return map;
  }
  if (value && typeof value === "object") {
    for (const [id, sample] of Object.entries(value)) {
      const rgba = normalizeRgba8(sample?.rgba8 ?? sample?.rgba ?? sample);
      if (rgba.length === 4) map.set(id, rgba);
    }
  }
  return map;
}

function normalizeRgba8(value) {
  if (!Array.isArray(value) || value.length !== 4) return [];
  return value.map((channel) => Math.max(0, Math.min(255, Math.trunc(finiteNumber(channel) ?? 0))));
}

function maxDelta(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== 4 || right.length !== 4) {
    return Number.POSITIVE_INFINITY;
  }
  return left.reduce((max, channel, index) => Math.max(max, Math.abs(channel - right[index])), 0);
}

function maxDeltaFromDelta(deltaRgba8) {
  return deltaRgba8.reduce((max, channel) => Math.max(max, Math.abs(channel)), 0);
}

function tolerance(traceCanvasParity) {
  return finiteNumber(traceCanvasParity?.tolerance?.maxChannelDelta) ?? 4;
}

function objectValue(value) {
  return value && typeof value === "object" && !Array.isArray(value) ? value : undefined;
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
