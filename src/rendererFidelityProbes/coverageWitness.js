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

  return {
    glancingThinRibbon: {
      name: "glancing-thin-ribbon",
      position: [0.4, 0, 8],
      scaleLog: logScales([0.55, 0.0005, 0.05]),
      rotation: identity,
      tolerance: 0.01,
    },
    resolvedEllipticalSplat: {
      name: "resolved-elliptical-splat",
      position: [0.2, -0.1, 7],
      scaleLog: logScales([0.45, 0.12, 0.08]),
      rotation: identity,
      tolerance: 0.01,
    },
  };
}
