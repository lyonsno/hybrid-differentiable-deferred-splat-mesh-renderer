const DEFAULT_MISSING_FIELDS = {
  projected: "tileLocal.perPixelProjectedContributors",
  retained: "tileLocal.perPixelRetainedContributors",
  ordered: "tileLocal.perPixelOrderedContributors",
  finalColorAccumulation: "tileLocal.perPixelFinalColorAccumulation",
};

const DEBUG_MODE_ORDER = [
  "coverage-weight",
  "accumulated-alpha",
  "transmittance",
  "tile-ref-count",
  "conic-shape",
];

export function buildFinalPixelContributorLedger({ witness = {}, pixels = [] } = {}) {
  const captures = Array.isArray(witness.captures) ? witness.captures : [];
  const captureById = new Map(captures.map((capture) => [capture.id, capture]));
  const finalColorCapture = captureById.get("final-color") ?? captures[0] ?? {};
  const tileLocal = finalColorCapture.pageEvidence?.tileLocal ?? {};
  const frameArenaRefs = tileLocal.budgetDiagnostics?.arenaRefs ?? {};
  const debugModes = DEBUG_MODE_ORDER.filter((id) => captureById.has(id));

  const entries = pixels.map((pixel) =>
    buildPixelLedgerEntry({
      pixel,
      finalColorCapture,
      frameArenaRefs,
      orderingBackend: stringOrEmpty(tileLocal.orderingBackend),
      visibleCompositedRefLimit: integerOrZero(tileLocal.visibleCompositedRefLimit),
      debugModes,
    }),
  );

  return {
    version: 1,
    baseUrl: stringOrEmpty(witness.baseUrl),
    pixelClasses: [...new Set(entries.map((entry) => entry.class))].sort(),
    pixels: entries,
    missingDiagnosticFields: collectMissingDiagnosticFields(entries),
  };
}

function buildPixelLedgerEntry({
  pixel,
  finalColorCapture,
  frameArenaRefs,
  orderingBackend,
  visibleCompositedRefLimit,
  debugModes,
}) {
  const supportRegion = stringOrEmpty(pixel.supportRegion);
  const projected = projectedEvidenceForRegion(finalColorCapture, supportRegion);
  const frameProjectedRefs = integerOrZero(frameArenaRefs.projected);
  const frameRetainedRefs = integerOrZero(frameArenaRefs.retained);
  const frameDroppedRefs = integerOrZero(frameArenaRefs.dropped);

  return {
    id: requiredString(pixel.id, "pixel.id"),
    class: requiredString(pixel.class, "pixel.class"),
    pixel: normalizeRectPoint(pixel.pixel, "pixel.pixel"),
    crop: normalizeCrop(pixel.crop),
    supportRegion: supportRegion || null,
    evidence: {
      projected:
        projected ??
        missingFieldEvidence("projected", DEFAULT_MISSING_FIELDS.projected, {
          frameProjectedRefs,
        }),
      retained: missingFieldEvidence("retained", DEFAULT_MISSING_FIELDS.retained, {
        frameRetainedRefs,
        frameDroppedRefs,
      }),
      ordered: missingFieldEvidence("ordered", DEFAULT_MISSING_FIELDS.ordered, {
        orderingBackend,
      }),
      finalColorAccumulation: missingFieldEvidence(
        "finalColorAccumulation",
        DEFAULT_MISSING_FIELDS.finalColorAccumulation,
        {
          visibleCompositedRefLimit,
        },
      ),
    },
    context: {
      rendererLabel: stringOrEmpty(finalColorCapture.pageEvidence?.rendererLabel),
      frameProjectedRefs,
      frameRetainedRefs,
      frameDroppedRefs,
      orderingBackend,
      visibleCompositedRefLimit,
      debugModes,
    },
  };
}

function projectedEvidenceForRegion(finalColorCapture, supportRegion) {
  if (!supportRegion) {
    return null;
  }
  const support = finalColorCapture.pageEvidence?.witness?.projection?.cropSupport?.[supportRegion];
  const count = integerOrNull(support?.projectedSupportCount);
  if (count === null || count <= 0) {
    return missingFieldEvidence(
      "projected",
      `witness.projection.cropSupport.${supportRegion}.projectedSupportCount`,
    );
  }
  return {
    status: "present",
    field: `witness.projection.cropSupport.${supportRegion}.projectedSupportCount`,
    count,
    diagnosticScope: "crop",
  };
}

function missingFieldEvidence(stage, missingField, context = {}) {
  return {
    status: "missing-diagnostic-field",
    stage,
    missingField,
    ...context,
  };
}

function collectMissingDiagnosticFields(entries) {
  const fields = new Set();
  for (const entry of entries) {
    for (const evidence of Object.values(entry.evidence)) {
      if (evidence.status === "missing-diagnostic-field" && evidence.missingField) {
        fields.add(evidence.missingField);
      }
    }
  }
  return [...fields].sort();
}

function normalizeRectPoint(value, label) {
  if (!value || typeof value !== "object") {
    throw new TypeError(`${label} must be an object with integer x/y fields`);
  }
  return {
    x: requiredInteger(value.x, `${label}.x`),
    y: requiredInteger(value.y, `${label}.y`),
  };
}

function normalizeCrop(value) {
  if (!value || typeof value !== "object") {
    throw new TypeError("pixel.crop must be an object with integer x/y/width/height fields");
  }
  return {
    x: requiredInteger(value.x, "pixel.crop.x"),
    y: requiredInteger(value.y, "pixel.crop.y"),
    width: requiredPositiveInteger(value.width, "pixel.crop.width"),
    height: requiredPositiveInteger(value.height, "pixel.crop.height"),
  };
}

function requiredString(value, label) {
  if (typeof value !== "string" || value.length === 0) {
    throw new TypeError(`${label} must be a non-empty string`);
  }
  return value;
}

function requiredInteger(value, label) {
  if (!Number.isInteger(value)) {
    throw new TypeError(`${label} must be an integer`);
  }
  return value;
}

function requiredPositiveInteger(value, label) {
  const integer = requiredInteger(value, label);
  if (integer <= 0) {
    throw new TypeError(`${label} must be positive`);
  }
  return integer;
}

function integerOrZero(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function integerOrNull(value) {
  return Number.isInteger(value) && value >= 0 ? value : null;
}

function stringOrEmpty(value) {
  return typeof value === "string" ? value : "";
}
