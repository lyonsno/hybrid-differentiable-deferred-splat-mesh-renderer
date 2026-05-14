const FRAME_CONTEXT = Object.freeze({
  effectiveArenaBackend: "gpu",
  orderingBackend: "gpu-sorted-index-rank-inversion",
  projectedCount: 2360150,
  retainedCount: 2360150,
  droppedCount: 0,
  visibleCompositedRefLimit: 256,
});

const REQUIRED_PER_PIXEL_FIELDS = Object.freeze([
  "perPixelContributors[].centerPx",
  "perPixelContributors[].inverseConic",
  "perPixelContributors[].coverageWeight",
  "perPixelContributors[].depth",
  "perPixelContributors[].projected",
  "perPixelContributors[].retained",
  "perPixelContributors[].dropped",
  "perPixelContributors[].orderedRank",
  "perPixelFinalColorAccumulation[]",
]);

export const ANCHOR_LEDGER_PIXELS = Object.freeze([
  Object.freeze({
    id: "lacunar-hole-dessert-1260-930",
    class: "lacunar-hole",
    pixel: Object.freeze({ x: 1260, y: 930 }),
    crop: Object.freeze({ x: 1232, y: 902, w: 80, h: 80 }),
    finalRgb: Object.freeze([25, 17, 15]),
    plateRgb: Object.freeze([79, 43, 30]),
    cropProjectedSupportCount: 2759,
    conicShapeRgb: Object.freeze([89, 128, 128]),
    backend: FRAME_CONTEXT,
  }),
  Object.freeze({
    id: "dense-foreground-leak-1580-1260",
    class: "dense-foreground-leak",
    pixel: Object.freeze({ x: 1580, y: 1260 }),
    crop: Object.freeze({ x: 1540, y: 1220, w: 96, h: 96 }),
    finalRgb: Object.freeze([81, 46, 32]),
    plateRgb: Object.freeze([80, 43, 28]),
    cropProjectedSupportCount: 5071,
    conicShapeRgb: Object.freeze([80, 255, 8]),
    backend: FRAME_CONTEXT,
  }),
  Object.freeze({
    id: "black-band-dropout-2300-1055",
    class: "black-band-dropout",
    pixel: Object.freeze({ x: 2300, y: 1055 }),
    crop: Object.freeze({ x: 2232, y: 1024, w: 160, h: 48 }),
    finalRgb: Object.freeze([5, 5, 10]),
    plateRgb: Object.freeze([80, 43, 28]),
    cropProjectedSupportCount: null,
    conicShapeRgb: Object.freeze([0, 0, 0]),
    backend: FRAME_CONTEXT,
  }),
]);

const readFinitePair = (value, name) => {
  if (!Array.isArray(value) || value.length !== 2 || !value.every(Number.isFinite)) {
    throw new Error(`${name} must be a finite [x, y] pair`);
  }
  return value;
};

const readInverseConic = (value, name) => {
  const inverseConic = Array.isArray(value)
    ? { xx: value[0], xy: value[1] ?? 0, yy: value[2] }
    : { xx: value?.xx, xy: value?.xy ?? 0, yy: value?.yy };
  if (![inverseConic.xx, inverseConic.xy, inverseConic.yy].every(Number.isFinite)) {
    throw new Error(`${name} must contain finite xx, xy, and yy values`);
  }
  const determinant = inverseConic.xx * inverseConic.yy - inverseConic.xy * inverseConic.xy;
  if (inverseConic.xx <= 0 || inverseConic.yy <= 0 || determinant <= 0) {
    throw new Error(`${name} must be positive definite`);
  }
  return inverseConic;
};

const readNonNegativeFinite = (value, name) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
  return value;
};

const clonePair = (pair) => [pair[0], pair[1]];
const cloneInverseConic = (inverseConic) => [inverseConic.xx, inverseConic.xy, inverseConic.yy];

export function conicPixelWeightAt({ pixel, centerPx, inverseConic }) {
  const pixelPair = Array.isArray(pixel) ? pixel : [pixel.x, pixel.y];
  const [px, py] = readFinitePair(pixelPair, "pixel");
  const center = readFinitePair(centerPx, "centerPx");
  const conic = readInverseConic(inverseConic, "inverseConic");
  const dx = px - center[0];
  const dy = py - center[1];
  const mahalanobis2 = conic.xx * dx * dx + 2 * conic.xy * dx * dy + conic.yy * dy * dy;
  return Math.exp(-2 * mahalanobis2);
}

export function classifyLedgerConicDiagnosticReadiness(anchorPixel) {
  const supportSummary =
    anchorPixel.cropProjectedSupportCount === null
      ? {
          status: "missing-band-specific-support-field",
          cropProjectedSupportCount: null,
        }
      : {
          status: "crop-projected-support-only",
          cropProjectedSupportCount: anchorPixel.cropProjectedSupportCount,
        };

  return {
    id: anchorPixel.id,
    class: anchorPixel.class,
    status: "blocked-missing-per-pixel-conic-trace",
    limitation:
      "debug RGB and crop-level support do not identify whether the sampled pixel had retained ordered conic support at final-color accumulation time",
    pixel: { ...anchorPixel.pixel },
    crop: { ...anchorPixel.crop },
    finalRgb: [...anchorPixel.finalRgb],
    plateRgb: [...anchorPixel.plateRgb],
    conicShapeRgb: [...anchorPixel.conicShapeRgb],
    supportSummary,
    backend: { ...anchorPixel.backend },
    missingFields: [...REQUIRED_PER_PIXEL_FIELDS],
  };
}

export function evaluateConicDensityAtPixel({
  id,
  pixel,
  minPixelCoverageWeight = 0.5,
  minTotalCoverageWeight = 1,
  contributors,
}) {
  if (!Array.isArray(contributors)) {
    throw new Error("contributors must be an array");
  }
  readNonNegativeFinite(minPixelCoverageWeight, "minPixelCoverageWeight");
  readNonNegativeFinite(minTotalCoverageWeight, "minTotalCoverageWeight");

  const measuredContributors = contributors.map((contributor) => {
    const centerPx = readFinitePair(contributor.centerPx, "contributor.centerPx");
    const inverseConic = readInverseConic(contributor.inverseConic, "contributor.inverseConic");
    const coverageWeight = readNonNegativeFinite(contributor.coverageWeight, "contributor.coverageWeight");
    const pixelCoverageWeight = conicPixelWeightAt({
      pixel,
      centerPx,
      inverseConic,
    });
    return {
      id: contributor.id,
      originalId: contributor.originalId,
      centerPx: clonePair(centerPx),
      inverseConic: cloneInverseConic(inverseConic),
      coverageWeight,
      depth: contributor.depth,
      projected: contributor.projected === true,
      retained: contributor.retained === true,
      dropped: contributor.dropped === true,
      pixelCoverageWeight,
    };
  });

  const retainedContributors = measuredContributors.filter((contributor) => contributor.retained && !contributor.dropped);
  const strongestContributor = retainedContributors.reduce(
    (strongest, contributor) =>
      !strongest || contributor.pixelCoverageWeight > strongest.pixelCoverageWeight ? contributor : strongest,
    null,
  );
  const totalCoverageWeight = retainedContributors.reduce(
    (sum, contributor) => sum + contributor.pixelCoverageWeight,
    0,
  );
  const maxCoverageWeight = strongestContributor?.pixelCoverageWeight ?? 0;
  const hasConicSupport =
    maxCoverageWeight >= minPixelCoverageWeight || totalCoverageWeight >= minTotalCoverageWeight;

  return {
    id,
    status: hasConicSupport ? "conic-density-sufficient" : "conic-density-underfill",
    mechanism: hasConicSupport ? "not-conic-density-underfill" : "screen-space-sampling-footprint-gap",
    pixel: Array.isArray(pixel) ? { x: pixel[0], y: pixel[1] } : { ...pixel },
    minPixelCoverageWeight,
    minTotalCoverageWeight,
    maxCoverageWeight,
    totalCoverageWeight,
    strongestContributor,
    contributors: measuredContributors,
  };
}

export function makeConicDensitySyntheticCases() {
  return {
    lacunarFootprintGap: {
      id: "synthetic-lacunar-footprint-gap",
      pixel: { x: 64, y: 64 },
      minPixelCoverageWeight: 0.5,
      minTotalCoverageWeight: 1,
      contributors: [
        {
          id: "upper-left",
          originalId: 101,
          centerPx: [56, 56],
          inverseConic: [1 / 9, 0, 1 / 9],
          coverageWeight: 0.21,
          depth: -3,
          projected: true,
          retained: true,
          dropped: false,
        },
        {
          id: "upper-right",
          originalId: 102,
          centerPx: [72, 56],
          inverseConic: [1 / 9, 0, 1 / 9],
          coverageWeight: 0.21,
          depth: -3.01,
          projected: true,
          retained: true,
          dropped: false,
        },
        {
          id: "lower-left",
          originalId: 103,
          centerPx: [56, 72],
          inverseConic: [1 / 9, 0, 1 / 9],
          coverageWeight: 0.21,
          depth: -3.02,
          projected: true,
          retained: true,
          dropped: false,
        },
        {
          id: "lower-right",
          originalId: 104,
          centerPx: [72, 72],
          inverseConic: [1 / 9, 0, 1 / 9],
          coverageWeight: 0.21,
          depth: -3.03,
          projected: true,
          retained: true,
          dropped: false,
        },
      ],
    },
    coveredForegroundSample: {
      id: "synthetic-covered-foreground-sample",
      pixel: { x: 64, y: 64 },
      minPixelCoverageWeight: 0.5,
      minTotalCoverageWeight: 1,
      contributors: [
        {
          id: "foreground-centered",
          originalId: 201,
          centerPx: [64, 64],
          inverseConic: [1 / 36, 0, 1 / 36],
          coverageWeight: 0.9,
          depth: -2,
          projected: true,
          retained: true,
          dropped: false,
        },
        {
          id: "behind-wide",
          originalId: 202,
          centerPx: [66, 64],
          inverseConic: [1 / 64, 0, 1 / 64],
          coverageWeight: 0.8,
          depth: -5,
          projected: true,
          retained: true,
          dropped: false,
        },
      ],
    },
  };
}
