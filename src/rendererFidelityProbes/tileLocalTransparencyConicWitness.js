import { composeOrderedAlphaTransfer } from "./alphaTransfer.js";

const EPSILON = 1e-30;

export function describeTileLocalTransparencyConicWitness() {
  return {
    consumes: [
      "conic-coverage:projected-covariance",
      "tile-local-compositor:ordered-alpha-transfer",
      "visual-smoke:tile-local-visible-comparison",
    ],
    witnesses: [
      "scalar-radius-overcoverage",
      "candidate-cap-drops-required-role",
    ],
    doesNotClaim: [
      "final-conic-shader-implementation",
      "final-contributor-spill-policy",
      "transparency-is-fixed",
      "scaniverse-reference-parity",
    ],
  };
}

export function compareConicToScalarRadiusWeight({
  covariancePx,
  centerPx,
  samplePx,
  overCoverageThreshold = 16,
} = {}) {
  const covariance = readCovariance(covariancePx);
  const center = readPoint(centerPx, "centerPx");
  const sample = readPoint(samplePx, "samplePx");
  validatePositiveFinite(overCoverageThreshold, "overCoverageThreshold");

  const dx = sample[0] - center[0];
  const dy = sample[1] - center[1];
  const scalarRadius = Math.max(1, Math.sqrt(Math.max(covariance.xx, covariance.yy)));
  const scalarRadiusWeight = Math.exp(-0.5 * ((dx * dx + dy * dy) / (scalarRadius * scalarRadius)));
  const conicWeight = conicGaussianWeight(covariance, dx, dy);
  const overCoverageRatio = scalarRadiusWeight / Math.max(conicWeight, EPSILON);
  const status = overCoverageRatio >= overCoverageThreshold
    ? "scalar-radius-overcoverage"
    : "conic-and-scalar-similar";

  return {
    status,
    recommendation: status === "scalar-radius-overcoverage"
      ? "replace-scalar-radius-with-projected-conic"
      : "scalar-radius-not-diagnostic-for-this-sample",
    scalarRadius,
    scalarRadiusWeight,
    conicWeight,
    overCoverageRatio,
    covariancePx: { xx: covariance.xx, xy: covariance.xy, yy: covariance.yy },
    centerPx: [...center],
    samplePx: [...sample],
  };
}

export function classifyTileLocalCandidateRetention({
  tileRefs,
  candidateCap,
  requiredRoles = [],
} = {}) {
  if (!Array.isArray(tileRefs)) {
    throw new TypeError("tileRefs must be an array");
  }
  validatePositiveInteger(candidateCap, "candidateCap");
  if (!Array.isArray(requiredRoles)) {
    throw new TypeError("requiredRoles must be an array");
  }
  const requiredRoleSet = new Set(requiredRoles);
  const normalized = tileRefs.map(normalizeTileRef);
  const coverageFirst = [...normalized]
    .sort(compareCoverageFirst)
    .slice(0, candidateCap)
    .sort(compareBackToFront);
  const coverageFirstIds = coverageFirst.map((tileRef) => tileRef.id);
  const retainedRoles = new Set(coverageFirst.map((tileRef) => tileRef.role));
  const droppedRequiredRoles = [...requiredRoleSet].filter((role) => !retainedRoles.has(role));
  const uncappedTransfer = composeOrderedAlphaTransfer(
    [...normalized].sort(compareBackToFront).map(toAlphaContribution)
  );
  const cappedTransfer = composeOrderedAlphaTransfer(coverageFirst.map(toAlphaContribution));
  const status = droppedRequiredRoles.length > 0
    ? "candidate-cap-drops-required-role"
    : "candidate-cap-retains-required-roles";

  return {
    status,
    recommendation: status === "candidate-cap-drops-required-role"
      ? "packetize-contributor-retention-policy"
      : "candidate-cap-retention-not-diagnostic-for-this-tile",
    candidateCap,
    totalRefs: normalized.length,
    requiredRoles: [...requiredRoleSet],
    droppedRequiredRoles,
    coverageFirstSelectedIds: coverageFirstIds,
    uncappedTransferWeights: uncappedTransfer.transferWeights,
    cappedTransferWeights: cappedTransfer.transferWeights,
  };
}

function conicGaussianWeight(covariance, dx, dy) {
  const invXx = covariance.yy / covariance.determinant;
  const invXy = -covariance.xy / covariance.determinant;
  const invYy = covariance.xx / covariance.determinant;
  const mahalanobis2 = invXx * dx * dx + 2 * invXy * dx * dy + invYy * dy * dy;
  return Math.exp(-0.5 * mahalanobis2);
}

function normalizeTileRef(tileRef, index) {
  if (!tileRef || typeof tileRef !== "object") {
    throw new TypeError(`tileRef ${index} must be an object`);
  }
  if (!("id" in tileRef)) {
    throw new TypeError(`tileRef ${index} id is required`);
  }
  const role = String(tileRef.role ?? "unclassified");
  validateFinite(tileRef.depth, `tileRef ${index} depth`);
  validateNonNegativeFinite(tileRef.coverageWeight, `tileRef ${index} coverageWeight`);
  validateUnitInterval(tileRef.opacity, `tileRef ${index} opacity`);
  validateColor(tileRef.color, `tileRef ${index} color`);
  return {
    id: String(tileRef.id),
    role,
    depth: tileRef.depth,
    coverageWeight: tileRef.coverageWeight,
    opacity: tileRef.opacity,
    color: [...tileRef.color],
  };
}

function compareCoverageFirst(left, right) {
  return (
    right.coverageWeight - left.coverageWeight ||
    left.depth - right.depth ||
    left.id.localeCompare(right.id)
  );
}

function compareBackToFront(left, right) {
  return left.depth - right.depth || left.id.localeCompare(right.id);
}

function toAlphaContribution(tileRef) {
  return {
    id: tileRef.id,
    depth: tileRef.depth,
    color: tileRef.color,
    opacity: tileRef.opacity,
    coverageWeight: tileRef.coverageWeight,
  };
}

function readCovariance(covariancePx) {
  const { xx, xy = 0, yy } = covariancePx ?? {};
  [xx, xy, yy].forEach((value, index) => validateFinite(value, `covariance component ${index}`));
  const determinant = xx * yy - xy * xy;
  if (xx <= 0 || yy <= 0 || determinant <= 0) {
    throw new RangeError("covariancePx must be positive definite");
  }
  return { xx, xy, yy, determinant };
}

function readPoint(point, label) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite [x, y] pair`);
  }
  return point;
}

function validateColor(color, label) {
  if (!Array.isArray(color) || color.length !== 3 || !color.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite rgb array`);
  }
}

function validateFinite(value, label) {
  if (!Number.isFinite(value)) {
    throw new TypeError(`${label} must be finite`);
  }
}

function validateNonNegativeFinite(value, label) {
  validateFinite(value, label);
  if (value < 0) {
    throw new RangeError(`${label} must be non-negative`);
  }
}

function validatePositiveFinite(value, label) {
  validateFinite(value, label);
  if (value <= 0) {
    throw new RangeError(`${label} must be positive`);
  }
}

function validatePositiveInteger(value, label) {
  if (!Number.isInteger(value) || value <= 0) {
    throw new RangeError(`${label} must be a positive integer`);
  }
}

function validateUnitInterval(value, label) {
  validateFinite(value, label);
  if (value < 0 || value > 1) {
    throw new RangeError(`${label} must be in [0, 1]`);
  }
}
