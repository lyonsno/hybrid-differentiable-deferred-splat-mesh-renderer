import { composeOrderedAlphaTransfer } from "./alphaTransfer.js";

const DEFAULT_CLEAR_COLOR = Object.freeze([0.02, 0.02, 0.04]);
const DEFAULT_REFERENCE_BEHIND_WEIGHT_THRESHOLD = 1e-3;
const DEFAULT_OBSERVED_BEHIND_WEIGHT_THRESHOLD = 1e-2;
const DEFAULT_COVERAGE_UNDERFILL_RATIO = 0.5;

export function describeDenseFrontOcclusionWitnessContract() {
  return {
    consumes: [
      "tile-local-visible:retained-tile-refs",
      "tile-local-visible:conic-pixel-weight",
      "alpha-transfer:optical-depth-source-over-reference",
    ],
    witnesses: [
      "dense-front-suppresses-bright-behind-reference",
      "tile-local-visible-bright-behind-leak",
      "foreground-under-opacity-vs-tile-list-loss",
    ],
    categories: [
      "coverage-underfill",
      "alpha-transfer",
      "tile-list-loss",
      "ordering-or-other",
      "no-leak",
    ],
    doesNotClaim: [
      "production-wgsl-fix",
      "global-opacity-tuning",
      "scaniverse-reference-parity",
    ],
  };
}

export function classifyDenseFrontOcclusionWitness({
  tileId,
  pixelPx,
  layers,
  requiredForegroundRoles = ["dense-foreground"],
  behindRoles = ["bright-behind"],
  clearColor = DEFAULT_CLEAR_COLOR,
  referenceBehindWeightThreshold = DEFAULT_REFERENCE_BEHIND_WEIGHT_THRESHOLD,
  observedBehindWeightThreshold = DEFAULT_OBSERVED_BEHIND_WEIGHT_THRESHOLD,
  coverageUnderfillRatio = DEFAULT_COVERAGE_UNDERFILL_RATIO,
} = {}) {
  validateNonNegativeInteger(tileId, "tileId");
  const pixel = readPoint(pixelPx, "pixelPx");
  validateColor(clearColor, "clearColor");
  validateNonNegativeFinite(referenceBehindWeightThreshold, "referenceBehindWeightThreshold");
  validateNonNegativeFinite(observedBehindWeightThreshold, "observedBehindWeightThreshold");
  validateUnitInterval(coverageUnderfillRatio, "coverageUnderfillRatio");
  const foregroundRoleSet = readRoleSet(requiredForegroundRoles, "requiredForegroundRoles");
  const behindRoleSet = readRoleSet(behindRoles, "behindRoles");
  if (!Array.isArray(layers)) {
    throw new TypeError("layers must be an array");
  }

  const orderedLayers = layers.map(normalizeLayer).sort(compareBackToFront);
  const referenceTransfer = composeOrderedAlphaTransfer(
    orderedLayers.map((layer) => toContribution(layer, layer.referenceCoverageWeight)),
    { clearColor },
  );
  const retainedLayers = orderedLayers.filter((layer) => layer.retained);
  const observedTransfer = composeOrderedAlphaTransfer(
    retainedLayers.map((layer) => toContribution(layer, layer.observedCoverageWeight)),
    { clearColor },
  );

  const referenceBehindWeight = sumRoleWeights(referenceTransfer.transferWeights, orderedLayers, behindRoleSet);
  const observedBehindWeight = sumRoleWeights(observedTransfer.transferWeights, retainedLayers, behindRoleSet);
  const coverage = summarizeCoverage(orderedLayers, retainedLayers, foregroundRoleSet);
  const retention = summarizeRetention(retainedLayers, foregroundRoleSet, behindRoleSet);
  const referenceSuppressesBehind = referenceBehindWeight <= referenceBehindWeightThreshold;
  const observedLeaksBehind = observedBehindWeight >= observedBehindWeightThreshold;
  const leakDetected = referenceSuppressesBehind && observedLeaksBehind;
  const category = leakDetected
    ? classifyLeak({ retention, coverage, coverageUnderfillRatio })
    : "no-leak";

  return {
    tileId,
    pixelPx: pixel,
    status: leakDetected ? "leak-detected" : "no-leak",
    category,
    recommendation: recommendationFor(category),
    reference: summarizeTransfer(referenceTransfer, referenceBehindWeight),
    observed: summarizeTransfer(observedTransfer, observedBehindWeight),
    coverage,
    retention,
  };
}

function classifyLeak({ retention, coverage, coverageUnderfillRatio }) {
  if (retention.missingForegroundRoles.length > 0) {
    return "tile-list-loss";
  }
  if (coverage.frontObservedToReferenceRatio < coverageUnderfillRatio) {
    return "coverage-underfill";
  }
  if (coverage.frontObservedCoverageWeight >= coverage.frontReferenceCoverageWeight * coverageUnderfillRatio) {
    return "alpha-transfer";
  }
  return "ordering-or-other";
}

function recommendationFor(category) {
  switch (category) {
    case "coverage-underfill":
    case "alpha-transfer":
      return "handoff-to-conic-coverage-or-alpha-ledger-with-this-witness";
    case "tile-list-loss":
      return "handoff-to-tile-list-retention-or-block-artifact-lane-with-this-witness";
    case "ordering-or-other":
      return "capture-tile-order-and-debug-heatmap-before-production-fix";
    case "no-leak":
      return "no-dense-front-occlusion-leak-for-this-witness";
    default:
      return "unclassified-witness";
  }
}

function summarizeTransfer(transfer, behindWeight) {
  return {
    color: transfer.color,
    alpha: transfer.alpha,
    remainingTransmission: transfer.remainingTransmission,
    behindWeight,
    transferWeights: transfer.transferWeights,
  };
}

function summarizeCoverage(referenceLayers, observedLayers, foregroundRoleSet) {
  let frontReferenceCoverageWeight = 0;
  let frontObservedCoverageWeight = 0;
  for (const layer of referenceLayers) {
    if (!foregroundRoleSet.has(layer.role)) continue;
    frontReferenceCoverageWeight += layer.referenceCoverageWeight;
  }
  for (const layer of observedLayers) {
    if (!foregroundRoleSet.has(layer.role)) continue;
    frontObservedCoverageWeight += layer.observedCoverageWeight;
  }
  return {
    frontReferenceCoverageWeight,
    frontObservedCoverageWeight,
    frontObservedToReferenceRatio: frontReferenceCoverageWeight > 0
      ? frontObservedCoverageWeight / frontReferenceCoverageWeight
      : 0,
  };
}

function summarizeRetention(layers, foregroundRoleSet, behindRoleSet) {
  const presentForegroundRoles = uniqueSorted(
    layers.filter((layer) => foregroundRoleSet.has(layer.role)).map((layer) => layer.role),
  );
  const presentBehindRoles = uniqueSorted(
    layers.filter((layer) => behindRoleSet.has(layer.role)).map((layer) => layer.role),
  );
  return {
    retainedLayerIds: layers.map((layer) => layer.id),
    presentForegroundRoles,
    missingForegroundRoles: [...foregroundRoleSet].filter((role) => !presentForegroundRoles.includes(role)),
    presentBehindRoles,
    missingBehindRoles: [...behindRoleSet].filter((role) => !presentBehindRoles.includes(role)),
  };
}

function sumRoleWeights(transferWeights, layers, roleSet) {
  const rolesById = new Map(layers.map((layer) => [layer.id, layer.role]));
  let sum = 0;
  for (const weight of transferWeights) {
    if (roleSet.has(rolesById.get(weight.id))) {
      sum += weight.weight;
    }
  }
  return sum;
}

function toContribution(layer, coverageWeight) {
  return {
    id: layer.id,
    depth: layer.depth,
    color: layer.color,
    opacity: layer.opacity,
    coverageWeight,
  };
}

function normalizeLayer(layer, index) {
  if (!layer || typeof layer !== "object") {
    throw new TypeError(`layer ${index} must be an object`);
  }
  if (!("id" in layer)) {
    throw new TypeError(`layer ${index} id is required`);
  }
  const id = String(layer.id);
  const role = String(layer.role ?? "unclassified");
  validateFinite(layer.depth, `layer ${index} depth`);
  validateColor(layer.color, `layer ${index} color`);
  validateUnitInterval(layer.opacity, `layer ${index} opacity`);
  validateNonNegativeFinite(layer.referenceCoverageWeight, `layer ${index} referenceCoverageWeight`);
  validateNonNegativeFinite(layer.tileCoverageWeight, `layer ${index} tileCoverageWeight`);
  const retained = "retained" in layer ? Boolean(layer.retained) : true;
  const conicPixelWeight = "conicPixelWeight" in layer ? layer.conicPixelWeight : 1;
  validateNonNegativeFinite(conicPixelWeight, `layer ${index} conicPixelWeight`);

  return {
    id,
    role,
    depth: layer.depth,
    color: [...layer.color],
    opacity: layer.opacity,
    referenceCoverageWeight: layer.referenceCoverageWeight,
    tileCoverageWeight: layer.tileCoverageWeight,
    conicPixelWeight,
    retained,
    observedCoverageWeight: layer.tileCoverageWeight * conicPixelWeight,
  };
}

function compareBackToFront(left, right) {
  return left.depth - right.depth || left.id.localeCompare(right.id);
}

function readPoint(point, label) {
  if (!Array.isArray(point) || point.length !== 2 || !point.every(Number.isFinite)) {
    throw new TypeError(`${label} must be a finite [x, y] pair`);
  }
  return [...point];
}

function readRoleSet(roles, label) {
  if (!Array.isArray(roles) || roles.length === 0) {
    throw new TypeError(`${label} must be a non-empty role array`);
  }
  return new Set(roles.map((role) => String(role)));
}

function uniqueSorted(values) {
  return [...new Set(values)].sort();
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

function validateUnitInterval(value, label) {
  validateFinite(value, label);
  if (value < 0 || value > 1) {
    throw new RangeError(`${label} must be in [0, 1]`);
  }
}

function validateNonNegativeInteger(value, label) {
  if (!Number.isInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer`);
  }
}
