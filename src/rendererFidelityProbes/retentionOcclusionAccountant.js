import {
  getRetentionOcclusionRequiredLedgerFields,
  summarizeRetentionOcclusionFrameEvidence,
} from "../gpuTileCoverageBridge.js";

const DEFAULT_BEHIND_LEAK_THRESHOLD = 1e-3;

export function describeRetentionOcclusionAccountantContract() {
  return {
    consumes: [
      "final-pixel-contributor-ledger:representative-real-scene-classes-and-coordinates",
      "tile-local-visible:per-pixel-projected-contributors",
      "tile-local-visible:per-pixel-retained-contributors",
      "tile-local-visible:per-pixel-ordered-contributors",
      "tile-local-visible:per-pixel-final-color-accumulation",
      "tile-local-visible:retention-audit",
    ],
    verdicts: [
      "sufficient",
      "insufficient",
      "misleadingly sufficient",
      "undiagnosable",
    ],
    forbiddenFixes: [
      "urmina-backend-redefinition",
      "source-decoding",
      "global-cap-raising",
      "global-opacity-or-brightness-tuning",
      "production-gbuffer-voting",
      "final-color-only-polish",
    ],
  };
}

export function classifyRetentionOcclusionLedger(input = {}) {
  const pixel = normalizeLedgerPixel(input);
  const frameEvidence = pixel.frameEvidence ?? summarizeRetentionOcclusionFrameEvidence({
    projectedContributorCount: pixel.frame?.projected ?? 0,
    retainedContributorCount: pixel.frame?.retained ?? 0,
    tileCount: pixel.frame?.tileCount ?? (pixel.frame?.tileGrid ? pixel.frame.tileGrid[0] * pixel.frame.tileGrid[1] : 0),
    maxRefsPerTile: pixel.frame?.visibleCompositedRefLimit ?? 0,
    tileRefCustody: pixel.frame?.tileRefCustody ?? null,
    retentionAudit: pixel.frame?.retentionAudit ?? null,
  });

  if (pixel.missingFields.length > 0) {
    return {
      status: "undiagnosable",
      reason: "missing-per-pixel-ledger-fields",
      pixel: pixel.identity,
      coordinates: pixel.coordinates,
      crop: pixel.crop,
      colors: pixel.colors,
      support: pixel.support,
      backend: pixel.backend,
      frame: pixel.frame,
      missingFields: pixel.missingFields,
      frameEvidence,
      repair: {
        keepContributorIds: [],
        displaceContributorIds: [],
        reason: "frame-level counts are not enough to separate retention from occlusion without per-pixel projected/retained/ordered/final-color evidence",
      },
    };
  }

  const projected = normalizeContributorList(pixel.tileLocal.perPixelProjectedContributors);
  const retained = normalizeContributorList(pixel.tileLocal.perPixelRetainedContributors);
  const ordered = normalizeContributorList(pixel.tileLocal.perPixelOrderedContributors);
  const accumulation = normalizeFinalColorAccumulation(pixel.tileLocal.perPixelFinalColorAccumulation);
  const projectedForeground = projected.filter((contributor) => contributor.side === "foreground");
  const retainedForeground = retained.filter((contributor) => contributor.side === "foreground");
  const retainedBehind = retained.filter((contributor) => contributor.side === "behind");
  const droppedForeground = projectedForeground.filter(
    (contributor) => !retained.some((retainedContributor) => contributor.identity === retainedContributor.identity),
  );
  const observedBehindWeight = accumulation.observedBehindWeight;
  const leakedBehind = accumulation.leakedBehind || observedBehindWeight > accumulation.behindLeakThreshold;
  const frame = {
    ...frameEvidence,
    projectedContributorCount: projected.length,
    retainedContributorCount: retained.length,
    orderedContributorCount: ordered.length,
  };

  if (projectedForeground.length === 0 || retainedForeground.length === 0 || droppedForeground.length > 0) {
    return {
      status: "insufficient",
      reason: "foreground-support-missing-from-retained-set",
      pixel: pixel.identity,
      coordinates: pixel.coordinates,
      crop: pixel.crop,
      colors: pixel.colors,
      support: pixel.support,
      backend: pixel.backend,
      frame,
      projectedContributors: projected,
      retainedContributors: retained,
      orderedContributors: ordered,
      finalColorAccumulation: accumulation,
      missingForegroundContributorIds: droppedForeground.map((contributor) => contributor.identity),
      repair: {
        keepContributorIds: projectedForeground.map((contributor) => contributor.identity),
        displaceContributorIds: retainedBehind.map((contributor) => contributor.identity),
        reason: "foreground contributors were projected but not retained, so the retained set is too weak to explain the pixel",
      },
    };
  }

  if (leakedBehind) {
    return {
      status: "misleadingly sufficient",
      reason: "retained-foreground-support-still-leaks-behind-contributors",
      pixel: pixel.identity,
      coordinates: pixel.coordinates,
      crop: pixel.crop,
      colors: pixel.colors,
      support: pixel.support,
      backend: pixel.backend,
      frame,
      projectedContributors: projected,
      retainedContributors: retained,
      orderedContributors: ordered,
      finalColorAccumulation: accumulation,
      leakingBehindContributorIds: retainedBehind.map((contributor) => contributor.identity),
      repair: {
        keepContributorIds: retainedForeground.map((contributor) => contributor.identity),
        displaceContributorIds: retainedBehind.map((contributor) => contributor.identity),
        reason: "foreground support is present, but ordering/final-color accumulation still lets behind contributors through",
      },
    };
  }

  return {
    status: "sufficient",
    reason: "retained-foreground-support-suppresses-behind-contributors",
    pixel: pixel.identity,
    coordinates: pixel.coordinates,
    crop: pixel.crop,
    colors: pixel.colors,
    support: pixel.support,
    backend: pixel.backend,
    frame,
    projectedContributors: projected,
    retainedContributors: retained,
    orderedContributors: ordered,
    finalColorAccumulation: accumulation,
    repair: {
      keepContributorIds: retainedForeground.map((contributor) => contributor.identity),
      displaceContributorIds: [],
      reason: "retained foreground contributors already explain the pixel and no behind leak remains",
    },
  };
}

function normalizeLedgerPixel(input) {
  if (!input || typeof input !== "object") {
    throw new TypeError("retention-occlusion ledger input must be an object");
  }

  const requiredFields = getRetentionOcclusionRequiredLedgerFields();
  const tileLocal = input.tileLocal ?? {};
  const missingFields = requiredFields.filter((field) => !hasPath(input, field));

  return {
    identity: {
      label: String(input.label ?? input.id ?? "unknown-ledger-pixel"),
    },
    coordinates: normalizePoint(input.pixelPx ?? input.pixel ?? input.coordinates, "pixel"),
    crop: normalizeRect(input.cropPx ?? input.crop ?? null),
    colors: {
      finalRgb: normalizeRgb(input.finalRgb ?? input.finalColorRgb ?? null, "finalRgb"),
      plateRgb: normalizeRgb(input.plateRgb ?? input.referenceRgb ?? null, "plateRgb"),
    },
    support: {
      cropProjectedSupportCount: normalizeOptionalInteger(input.cropProjectedSupportCount ?? input.support?.cropProjectedSupportCount),
    },
    backend: {
      effectiveArenaBackend: String(input.frame?.effectiveArenaBackend ?? input.backend?.effectiveArenaBackend ?? "unknown"),
      orderingBackend: String(input.frame?.orderingBackend ?? input.backend?.orderingBackend ?? "unknown"),
      visibleCompositedRefLimit: normalizeOptionalInteger(input.frame?.visibleCompositedRefLimit ?? input.backend?.visibleCompositedRefLimit),
    },
    frame: normalizeFrame(input.frame),
    frameEvidence: input.frameEvidence ?? input.retentionOcclusionFrameEvidence ?? null,
    tileLocal,
    missingFields,
  };
}

function normalizeFrame(frame) {
  if (!frame || typeof frame !== "object") {
    return {
      viewport: null,
      tileGrid: null,
      projected: 0,
      retained: 0,
      dropped: 0,
      tileCount: 0,
      visibleCompositedRefLimit: 0,
    };
  }
  return {
    viewport: normalizeViewport(frame.viewport ?? frame.viewportPx ?? null),
    tileGrid: normalizeTileGrid(frame.tileGrid ?? null),
    projected: normalizeOptionalInteger(frame.projected),
    retained: normalizeOptionalInteger(frame.retained),
    dropped: normalizeOptionalInteger(frame.dropped),
    tileCount: normalizeOptionalInteger(frame.tileCount ?? frame.tileGrid?.[0] * frame.tileGrid?.[1]),
    visibleCompositedRefLimit: normalizeOptionalInteger(frame.visibleCompositedRefLimit),
    tileRefCustody: frame.tileRefCustody ?? null,
    retentionAudit: frame.retentionAudit ?? null,
    effectiveArenaBackend: frame.effectiveArenaBackend ?? null,
    orderingBackend: frame.orderingBackend ?? null,
  };
}

function normalizeContributorList(list) {
  if (!Array.isArray(list)) {
    return [];
  }
  return list.map((contributor, index) => normalizeContributor(contributor, index));
}

function normalizeContributor(contributor, index) {
  if (!contributor || typeof contributor !== "object") {
    throw new TypeError(`per-pixel contributor ${index} must be an object`);
  }
  return {
    identity: String(contributor.identity ?? contributor.id ?? contributor.originalId ?? contributor.splatIndex ?? index),
    side: classifyContributorSide(contributor),
    depth: normalizeOptionalNumber(contributor.depth ?? contributor.viewDepth),
    retained: contributor.retained !== false,
    coverageWeight: normalizeOptionalNumber(contributor.coverageWeight ?? contributor.weight),
    contributor,
  };
}

function classifyContributorSide(contributor) {
  const side = String(contributor.side ?? contributor.role ?? contributor.band ?? contributor.retentionBand ?? "").toLowerCase();
  if (side.includes("behind") || side === "back") {
    return "behind";
  }
  if (side.includes("front") || side === "foreground") {
    return "foreground";
  }
  if (typeof contributor.depthBand === "number") {
    return contributor.depthBand >= 2 ? "behind" : "foreground";
  }
  if (typeof contributor.viewDepth === "number") {
    return contributor.viewDepth > 0.5 ? "behind" : "foreground";
  }
  return "foreground";
}

function normalizeFinalColorAccumulation(accumulation) {
  const observedBehindWeight = normalizeOptionalNumber(accumulation?.observedBehindWeight ?? accumulation?.behindWeight);
  const referenceBehindWeight = normalizeOptionalNumber(accumulation?.referenceBehindWeight ?? 0);
  const remainingTransmission = normalizeOptionalNumber(accumulation?.remainingTransmission ?? accumulation?.transmittance ?? 1);
  const leakedBehind = accumulation?.leakedBehind === true || observedBehindWeight > DEFAULT_BEHIND_LEAK_THRESHOLD;
  return {
    observedBehindWeight,
    referenceBehindWeight,
    remainingTransmission,
    leakedBehind,
    behindLeakThreshold: normalizeOptionalNumber(accumulation?.behindLeakThreshold ?? DEFAULT_BEHIND_LEAK_THRESHOLD),
  };
}

function normalizePoint(point, label) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite [x, y] pair`);
  }
  return [point[0], point[1]];
}

function normalizeRect(rect) {
  if (!rect || typeof rect !== "object") {
    return null;
  }
  const x = normalizeOptionalNumber(rect.x);
  const y = normalizeOptionalNumber(rect.y);
  const w = normalizeOptionalNumber(rect.w ?? rect.width);
  const h = normalizeOptionalNumber(rect.h ?? rect.height);
  if (![x, y, w, h].every(Number.isFinite)) {
    return null;
  }
  return { x, y, w, h };
}

function normalizeViewport(viewport) {
  if (!Array.isArray(viewport) || viewport.length !== 2 || !viewport.every(Number.isFinite)) {
    return null;
  }
  return [viewport[0], viewport[1]];
}

function normalizeTileGrid(tileGrid) {
  if (!Array.isArray(tileGrid) || tileGrid.length !== 2 || !tileGrid.every(Number.isFinite)) {
    return null;
  }
  return [tileGrid[0], tileGrid[1]];
}

function normalizeRgb(rgb, label) {
  if (!Array.isArray(rgb) || rgb.length !== 3 || !rgb.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite rgb triplet`);
  }
  return [rgb[0], rgb[1], rgb[2]];
}

function hasPath(object, path) {
  const parts = String(path).split(".");
  let current = object;
  for (const part of parts) {
    if (current == null || typeof current !== "object" || !(part in current)) {
      return false;
    }
    current = current[part];
  }
  return true;
}

function normalizeOptionalInteger(value) {
  return Number.isInteger(value) && value >= 0 ? value : 0;
}

function normalizeOptionalNumber(value) {
  return Number.isFinite(value) ? value : 0;
}
