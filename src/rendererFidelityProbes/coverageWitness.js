import { referenceJacobianCovariance } from "./conicProjection.js";

const DEFAULT_SPLAT_SCALE_DIVISOR = 600;
const DEFAULT_MIN_RADIUS_PX = 0.75;
const DEFAULT_OVER_COVERAGE_RATIO = 4;

const readPositiveFinite = (value, name) => {
  if (!Number.isFinite(value) || value <= 0) {
    throw new Error(`${name} must be a positive finite number`);
  }
  return value;
};

const readNonNegativeFinite = (value, name) => {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${name} must be a finite non-negative number`);
  }
  return value;
};

export function ellipseRadiiFromCovariance(covariance) {
  const trace = 0.5 * (covariance.xx + covariance.yy);
  const diff = 0.5 * (covariance.xx - covariance.yy);
  const root = Math.sqrt(diff * diff + covariance.xy * covariance.xy);
  const major = Math.sqrt(Math.max(trace + root, 0));
  const minor = Math.sqrt(Math.max(trace - root, 0));
  return { major, minor };
}

export function coverageRadiiPxForCase(
  conicCase,
  { viewportMinPx, splatScale = 1, splatScaleDivisor = DEFAULT_SPLAT_SCALE_DIVISOR } = {}
) {
  readPositiveFinite(viewportMinPx, "viewportMinPx");
  readNonNegativeFinite(splatScale, "splatScale");
  readPositiveFinite(splatScaleDivisor, "splatScaleDivisor");

  const covariance = referenceJacobianCovariance(conicCase);
  const radiiNdc = ellipseRadiiFromCovariance(covariance);
  const pixelsPerNdcRadius = viewportMinPx * 0.5;
  const scale = splatScale / splatScaleDivisor;
  return {
    major: radiiNdc.major * scale * pixelsPerNdcRadius,
    minor: radiiNdc.minor * scale * pixelsPerNdcRadius,
  };
}

export function measureCoverageCase(
  conicCase,
  {
    viewportMinPx,
    splatScale = 1,
    splatScaleDivisor = DEFAULT_SPLAT_SCALE_DIVISOR,
    minRadiusPx = DEFAULT_MIN_RADIUS_PX,
    overCoverageRatio = DEFAULT_OVER_COVERAGE_RATIO,
  } = {}
) {
  readNonNegativeFinite(minRadiusPx, "minRadiusPx");
  readPositiveFinite(overCoverageRatio, "overCoverageRatio");

  const referenceRadiiPx = coverageRadiiPxForCase(conicCase, {
    viewportMinPx,
    splatScale,
    splatScaleDivisor,
  });
  const flooredRadiiPx = {
    major: Math.max(referenceRadiiPx.major, minRadiusPx),
    minor: Math.max(referenceRadiiPx.minor, minRadiusPx),
  };
  const referenceAreaPx = Math.PI * referenceRadiiPx.major * referenceRadiiPx.minor;
  const flooredAreaPx = Math.PI * flooredRadiiPx.major * flooredRadiiPx.minor;
  const areaInflation = referenceAreaPx > 0 ? flooredAreaPx / referenceAreaPx : Number.POSITIVE_INFINITY;
  const flooredAxes =
    Number(referenceRadiiPx.major < minRadiusPx) + Number(referenceRadiiPx.minor < minRadiusPx);
  const status = flooredAxes > 0 && areaInflation >= overCoverageRatio ? "min-radius-overcoverage" : "reference-coverage";

  return {
    name: conicCase.name,
    status,
    recommendation:
      status === "min-radius-overcoverage"
        ? "report-coverage-floor-do-not-change-opacity"
        : "keep-jacobian-conic-coverage",
    referenceRadiiPx,
    flooredRadiiPx,
    referenceAreaPx,
    flooredAreaPx,
    areaInflation,
    flooredAxes,
    inputs: {
      viewportMinPx,
      splatScale,
      splatScaleDivisor,
      minRadiusPx,
      overCoverageRatio,
    },
  };
}

export function makeCoverageSyntheticCases() {
  const identity = [1, 0, 0, 0];
  const logScales = (values) => values.map((value) => Math.log(value));
  const denseSheetLayers = [
    { id: "bright-behind", depth: -10, color: [8, 8, 8], alpha: 0.6 },
    ...Array.from({ length: 72 }, (_, index) => ({
      id: `sheet-${String(index).padStart(2, "0")}`,
      depth: -9 + index * 0.1,
      color: [0.4, 0.45, 0.5],
      alpha: 0.08,
    })),
  ];

  const cases = {
    singleSplat: {
      name: "single-splat",
      position: [0.2, -0.1, 7],
      scaleLog: logScales([0.45, 0.12, 0.08]),
      rotation: identity,
      opacity: 0.7,
      color: [1, 0.9, 0.7],
      tolerance: 0.01,
      coverageSamples: [
        {
          name: "center",
          radiusSquared: 0,
          expectedCoverageWeight: 1,
          expectedAlpha: 0.7,
        },
        {
          name: "one-sigma-major",
          radiusSquared: 1,
          expectedCoverageWeight: Math.exp(-2),
          expectedAlpha: 0.7 * Math.exp(-2),
        },
      ],
    },
    extremeAnisotropicSplat: {
      name: "extreme-anisotropic-splat",
      position: [0, 0, 8],
      scaleLog: logScales([1.6, 0.001, 0.05]),
      rotation: identity,
      opacity: 0.45,
      color: [0.8, 0.95, 1],
      tolerance: 0.01,
    },
    glancingThinRibbon: {
      name: "glancing-thin-ribbon",
      position: [0.4, 0, 8],
      scaleLog: logScales([0.55, 0.0005, 0.05]),
      rotation: identity,
      tolerance: 0.01,
    },
    denseTransparentSheetWithBrightBehind: {
      name: "dense-transparent-sheet-with-bright-behind",
      surfaceLayerCount: 72,
      surfaceAlpha: 0.08,
      brightBehindAlpha: 0.6,
      layers: denseSheetLayers,
      expectedBrightBehindWeight: 0.6 * Math.pow(0.92, 72),
    },
    crossingTranslucentLayers: {
      name: "crossing-translucent-layers",
      samples: [
        {
          name: "red-front-sample",
          layers: [
            { id: "blue-layer", depth: -2, color: [0, 0, 1], alpha: 0.5 },
            { id: "red-layer", depth: -1, color: [1, 0, 0], alpha: 0.5 },
          ],
          expectedDrawIds: ["blue-layer", "red-layer"],
          expectedColor: [0.505, 0.005, 0.26],
        },
        {
          name: "blue-front-sample",
          layers: [
            { id: "red-layer", depth: -2, color: [1, 0, 0], alpha: 0.5 },
            { id: "blue-layer", depth: -1, color: [0, 0, 1], alpha: 0.5 },
          ],
          expectedDrawIds: ["red-layer", "blue-layer"],
          expectedColor: [0.255, 0.005, 0.51],
        },
      ],
    },
  };

  Object.defineProperty(cases, "resolvedEllipticalSplat", {
    value: cases.singleSplat,
    enumerable: false,
  });

  return cases;
}
