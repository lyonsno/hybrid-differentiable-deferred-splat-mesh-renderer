const DEFAULT_FOCAL = 1;
const DEFAULT_NEAR_PLANE_Z = 0.1;
const DEFAULT_SPLAT_SCALE_DIVISOR = 600;
const DEFAULT_MIN_RADIUS_PX = 1.5;
const DEFAULT_TOLERANCE = 0.08;
const MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION = 4;
const MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION = 1 / 64;

const add3 = (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]];
const scale3 = (v, s) => [v[0] * s, v[1] * s, v[2] * s];
const outer2 = (v) => ({ xx: v[0] * v[0], xy: v[0] * v[1], yy: v[1] * v[1] });
const addCovariance2 = (a, b) => ({ xx: a.xx + b.xx, xy: a.xy + b.xy, yy: a.yy + b.yy });
const covarianceFrobenius = (c) => Math.hypot(c.xx, Math.SQRT2 * c.xy, c.yy);
const covarianceDeltaFrobenius = (a, b) =>
  Math.hypot(a.xx - b.xx, Math.SQRT2 * (a.xy - b.xy), a.yy - b.yy);

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

export function rotateAxisWxyz(rotation, axis) {
  const length = Math.hypot(rotation[0], rotation[1], rotation[2], rotation[3]);
  const safeLength = Math.max(length, 0.000001);
  const w = rotation[0] / safeLength;
  const ux = rotation[1] / safeLength;
  const uy = rotation[2] / safeLength;
  const uz = rotation[3] / safeLength;
  const [x, y, z] = axis;
  const crossUx = uy * z - uz * y;
  const crossUy = uz * x - ux * z;
  const crossUz = ux * y - uy * x;
  const innerX = crossUx + w * x;
  const innerY = crossUy + w * y;
  const innerZ = crossUz + w * z;
  return [
    x + 2 * (uy * innerZ - uz * innerY),
    y + 2 * (uz * innerX - ux * innerZ),
    z + 2 * (ux * innerY - uy * innerX),
  ];
}

export function projectPinhole(point, focal = DEFAULT_FOCAL) {
  return [(focal * point[0]) / point[2], (focal * point[1]) / point[2]];
}

export function currentEndpointCovariance({ position, scaleLog, rotation, focal = DEFAULT_FOCAL }) {
  const center = projectPinhole(position, focal);
  const scales = scaleLog.map((value) => Math.exp(value));
  const unitAxes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];

  return unitAxes
    .map((axis, index) => scale3(rotateAxisWxyz(rotation, axis), scales[index]))
    .map((axis) => {
      const projected = projectPinhole(add3(position, axis), focal);
      return [projected[0] - center[0], projected[1] - center[1]];
    })
    .map(outer2)
    .reduce(addCovariance2, { xx: 0, xy: 0, yy: 0 });
}

export function referenceJacobianCovariance({ position, scaleLog, rotation, focal = DEFAULT_FOCAL }) {
  const [x, y, z] = position;
  const jx = [focal / z, 0, (-focal * x) / (z * z)];
  const jy = [0, focal / z, (-focal * y) / (z * z)];
  const scales = scaleLog.map((value) => Math.exp(value));
  const unitAxes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const covariance3 = unitAxes
    .map((axis, index) => scale3(rotateAxisWxyz(rotation, axis), scales[index]))
    .map((axis) => ({
      xx: axis[0] * axis[0],
      xy: axis[0] * axis[1],
      xz: axis[0] * axis[2],
      yy: axis[1] * axis[1],
      yz: axis[1] * axis[2],
      zz: axis[2] * axis[2],
    }))
    .reduce(
      (a, b) => ({
        xx: a.xx + b.xx,
        xy: a.xy + b.xy,
        xz: a.xz + b.xz,
        yy: a.yy + b.yy,
        yz: a.yz + b.yz,
        zz: a.zz + b.zz,
      }),
      { xx: 0, xy: 0, xz: 0, yy: 0, yz: 0, zz: 0 }
    );

  const applyQuadratic = (a, b) =>
    a[0] * (b[0] * covariance3.xx + b[1] * covariance3.xy + b[2] * covariance3.xz) +
    a[1] * (b[0] * covariance3.xy + b[1] * covariance3.yy + b[2] * covariance3.yz) +
    a[2] * (b[0] * covariance3.xz + b[1] * covariance3.yz + b[2] * covariance3.zz);

  return {
    xx: applyQuadratic(jx, jx),
    xy: applyQuadratic(jx, jy),
    yy: applyQuadratic(jy, jy),
  };
}

export function nearPlaneSupport({ position, scaleLog, rotation, nearPlaneZ = DEFAULT_NEAR_PLANE_Z }) {
  const scales = scaleLog.map((value) => Math.exp(value));
  const unitAxes = [
    [1, 0, 0],
    [0, 1, 0],
    [0, 0, 1],
  ];
  const support = unitAxes.map((axis, index) => add3(position, scale3(rotateAxisWxyz(rotation, axis), scales[index])));
  const minSupportZ = Math.min(position[2], ...support.map((point) => point[2]));
  return {
    centerBehindNearPlane: position[2] <= nearPlaneZ,
    crossesNearPlane: position[2] > nearPlaneZ && minSupportZ <= nearPlaneZ,
    minSupportZ,
    nearPlaneZ,
  };
}

export function ellipseRadiiFromCovariance(covariance) {
  const trace = 0.5 * (covariance.xx + covariance.yy);
  const diff = 0.5 * (covariance.xx - covariance.yy);
  const root = Math.sqrt(diff * diff + covariance.xy * covariance.xy);
  const major = Math.sqrt(Math.max(trace + root, 0));
  const minor = Math.sqrt(Math.max(trace - root, 0));
  return { major, minor };
}

export function boundedMinorRadiusPx(rawMajorRadiusPx, rawMinorRadiusPx, minRadiusPx) {
  if (rawMinorRadiusPx >= minRadiusPx) {
    return rawMinorRadiusPx;
  }
  if (rawMajorRadiusPx < minRadiusPx) {
    return minRadiusPx;
  }
  const inflatedMinor = Math.max(
    rawMinorRadiusPx * MAX_ANISOTROPIC_MINOR_RADIUS_INFLATION,
    minRadiusPx * MIN_ANISOTROPIC_MINOR_RADIUS_FRACTION
  );
  return Math.min(minRadiusPx, inflatedMinor);
}

export function measureProjectedFragmentCoverage(
  conicCase,
  {
    viewportMinPx,
    splatScale = 1,
    splatScaleDivisor = DEFAULT_SPLAT_SCALE_DIVISOR,
    minRadiusPx = DEFAULT_MIN_RADIUS_PX,
  } = {}
) {
  readPositiveFinite(viewportMinPx, "viewportMinPx");
  readNonNegativeFinite(splatScale, "splatScale");
  readPositiveFinite(splatScaleDivisor, "splatScaleDivisor");
  readNonNegativeFinite(minRadiusPx, "minRadiusPx");

  const covariance = referenceJacobianCovariance(conicCase);
  const radiiNdc = ellipseRadiiFromCovariance(covariance);
  const pixelsPerNdcRadius = viewportMinPx * 0.5;
  const scale = splatScale / splatScaleDivisor;
  const rawRadiiPx = {
    major: radiiNdc.major * scale * pixelsPerNdcRadius,
    minor: radiiNdc.minor * scale * pixelsPerNdcRadius,
  };
  const calibratedRadiiPx = {
    major: Math.max(rawRadiiPx.major, minRadiusPx),
    minor: boundedMinorRadiusPx(rawRadiiPx.major, rawRadiiPx.minor, minRadiusPx),
  };
  const rawAreaPx = Math.PI * rawRadiiPx.major * rawRadiiPx.minor;
  const calibratedAreaPx = Math.PI * calibratedRadiiPx.major * calibratedRadiiPx.minor;
  const areaInflation = rawAreaPx > 0 ? calibratedAreaPx / rawAreaPx : Number.POSITIVE_INFINITY;
  const flooredAxes = Number(rawRadiiPx.major < minRadiusPx) + Number(rawRadiiPx.minor < minRadiusPx);
  const status =
    rawRadiiPx.minor < minRadiusPx && rawRadiiPx.major >= minRadiusPx && calibratedRadiiPx.minor < minRadiusPx
      ? "thin-glancing-anti-fuzz"
      : "reference-coverage";

  return {
    name: conicCase.name,
    status,
    recommendation:
      status === "thin-glancing-anti-fuzz"
        ? "keep-anisotropic-min-radius"
        : "keep-jacobian-conic-coverage",
    rawRadiiPx,
    calibratedRadiiPx,
    rawAreaPx,
    calibratedAreaPx,
    areaInflation,
    flooredAxes,
    inputs: {
      viewportMinPx,
      splatScale,
      splatScaleDivisor,
      minRadiusPx,
    },
  };
}

export function compareProjectedConicCase(conicCase, options = undefined) {
  const referenceCovariance = referenceJacobianCovariance(conicCase);
  const endpointCovariance = currentEndpointCovariance(conicCase);
  const absoluteFrobeniusError = covarianceDeltaFrobenius(referenceCovariance, endpointCovariance);
  const relativeFrobeniusError = absoluteFrobeniusError / Math.max(covarianceFrobenius(referenceCovariance), 1e-12);
  const fragmentFootprint = options && "viewportMinPx" in options ? measureProjectedFragmentCoverage(conicCase, options) : undefined;

  return {
    name: conicCase.name,
    reference: { covariance: referenceCovariance },
    endpointApproximation: { covariance: endpointCovariance },
    absoluteFrobeniusError,
    relativeFrobeniusError,
    tolerance: conicCase.tolerance ?? DEFAULT_TOLERANCE,
    nearPlaneSupport: nearPlaneSupport(conicCase),
    fragmentFootprint,
  };
}

export function classifyConicCase(conicCase) {
  const comparison = compareProjectedConicCase(conicCase);
  if (comparison.nearPlaneSupport.centerBehindNearPlane) {
    return {
      name: conicCase.name,
      status: "reject-center",
      recommendation: "reject",
      comparison,
    };
  }
  if (comparison.nearPlaneSupport.crossesNearPlane) {
    return {
      name: conicCase.name,
      status: "near-plane-support",
      recommendation: "consume-slab-sentinel-policy",
      comparison,
    };
  }
  if (comparison.relativeFrobeniusError > comparison.tolerance) {
    return {
      name: conicCase.name,
      status: "approximation-fails",
      recommendation: "use-jacobian-conic-reference",
      comparison,
    };
  }
  return {
    name: conicCase.name,
    status: "acceptable",
    recommendation: "current-approximation-within-stated-bound",
    comparison,
  };
}

export function makeConicSyntheticCases() {
  const identity = [1, 0, 0, 0];
  const halfTurnAroundX = [0, 1, 0, 0];
  const fortyFiveAroundZ = [Math.SQRT1_2, 0, 0, Math.SQRT1_2];
  const logScales = (values) => values.map((value) => Math.log(value));

  return {
    smallCentered: {
      name: "small-centered",
      position: [0, 0, 12],
      scaleLog: logScales([0.04, 0.03, 0.02]),
      rotation: identity,
      tolerance: 0.01,
    },
    rotatedInPlane: {
      name: "rotated-in-plane",
      position: [0, 0, 10],
      scaleLog: logScales([0.32, 0.05, 0.02]),
      rotation: fortyFiveAroundZ,
      tolerance: 0.01,
    },
    edgeOnDepthAnisotropy: {
      name: "edge-on-depth-anisotropy",
      position: [0.85, 0, 2.5],
      scaleLog: logScales([0.04, 0.04, 1.2]),
      rotation: identity,
      tolerance: 0.08,
    },
    perspectiveDepthAxisForward: {
      name: "perspective-depth-axis-forward",
      position: [1, 0, 2.5],
      scaleLog: logScales([0.04, 0.04, 1.2]),
      rotation: identity,
      tolerance: 0.08,
    },
    perspectiveDepthAxisBackward: {
      name: "perspective-depth-axis-backward",
      position: [1, 0, 2.5],
      scaleLog: logScales([0.04, 0.04, 1.2]),
      rotation: halfTurnAroundX,
      tolerance: 0.08,
    },
    glancingThinRibbon: {
      name: "glancing-thin-ribbon",
      position: [0.4, 0, 8],
      scaleLog: logScales([0.55, 0.0005, 0.05]),
      rotation: identity,
      tolerance: 0.01,
    },
    nearPlaneAdjacent: {
      name: "near-plane-adjacent",
      position: [0.2, 0, 0.6],
      scaleLog: logScales([0.03, 0.03, 0.8]),
      rotation: halfTurnAroundX,
      nearPlaneZ: DEFAULT_NEAR_PLANE_Z,
      tolerance: 0.08,
    },
  };
}
