export const DEFAULT_TILE_LOCAL_BUDGET_CONFIG = Object.freeze({
  tileSizePx: 6,
  maxRefsPerTile: 32,
});

export function resolveTileLocalBudgetConfig(input = "") {
  const params = normalizeSearchParams(input);
  const hasTileSize = params.has("tileSizePx");
  const hasMaxRefs = params.has("maxRefsPerTile");
  if (hasTileSize !== hasMaxRefs) {
    return fallbackConfig("tileSizePx and maxRefsPerTile must be provided together");
  }
  if (!hasTileSize) {
    return { ...DEFAULT_TILE_LOCAL_BUDGET_CONFIG };
  }
  const tileSizePx = readPositiveInteger(params.get("tileSizePx"), "tileSizePx");
  const maxRefsPerTile = readPositiveInteger(params.get("maxRefsPerTile"), "maxRefsPerTile");
  if (typeof tileSizePx === "string") {
    return fallbackConfig(tileSizePx);
  }
  if (typeof maxRefsPerTile === "string") {
    return fallbackConfig(maxRefsPerTile);
  }
  return {
    tileSizePx,
    maxRefsPerTile,
  };
}

export function formatTileLocalBudgetPair(config) {
  return `${config.tileSizePx}px/${config.maxRefsPerTile} refs`;
}

export function classifyTileLocalProjectedRefGuard(input = {}) {
  const projectedRefs = readNonNegativeFiniteInteger(input.projectedRefs);
  const maxProjectedRefs = readNonNegativeFiniteInteger(input.maxProjectedRefs);
  const viewportWidth = readPositiveFiniteInteger(input.viewportWidth);
  const viewportHeight = readPositiveFiniteInteger(input.viewportHeight);
  const tileSizePx = readPositiveFiniteInteger(input.tileSizePx);
  const maxRefsPerTile = readPositiveFiniteInteger(input.maxRefsPerTile);
  const requestedArenaBackend = input.requestedArenaBackend ?? "unknown";
  const handoffSource = input.handoffSource ?? (requestedArenaBackend === "gpu" ? "retained-list" : "dense-projected-list");
  const hasRequiredNumbers = [
    projectedRefs,
    maxProjectedRefs,
    viewportWidth,
    viewportHeight,
    tileSizePx,
    maxRefsPerTile,
  ].every(Number.isFinite);
  const tileColumns = hasRequiredNumbers ? Math.ceil(viewportWidth / tileSizePx) : null;
  const tileRows = hasRequiredNumbers ? Math.ceil(viewportHeight / tileSizePx) : null;
  const tileCount = hasRequiredNumbers ? tileColumns * tileRows : null;
  const retainedBudgetRefs = hasRequiredNumbers ? tileCount * maxRefsPerTile : null;
  const projectedOverflow = hasRequiredNumbers ? projectedRefs > maxProjectedRefs : null;
  const retainedBudgetWithinProjectedLimit = hasRequiredNumbers ? retainedBudgetRefs <= maxProjectedRefs : null;
  const retainedHandoff = handoffSource === "retained-list";
  let classification = "guard-underinstrumented";

  if (hasRequiredNumbers && !projectedOverflow) {
    classification = "guard-valid-blocker";
  } else if (hasRequiredNumbers && retainedHandoff && retainedBudgetWithinProjectedLimit) {
    classification = "guard-misapplied-to-retained-handoff";
  } else if (hasRequiredNumbers && retainedHandoff) {
    classification = "guard-needs-dynamic-budget";
  } else if (hasRequiredNumbers) {
    classification = "guard-valid-blocker";
  }

  return {
    classification,
    guardedQuantity: "dense-projected-tile-refs",
    handoffQuantity: retainedHandoff ? "per-tile-retained-ref-capacity" : "dense-projected-tile-refs",
    requestedArenaBackend,
    handoffSource,
    projectedRefs: Number.isFinite(projectedRefs) ? projectedRefs : null,
    maxProjectedRefs: Number.isFinite(maxProjectedRefs) ? maxProjectedRefs : null,
    projectedOverflow,
    tileSizePx: Number.isFinite(tileSizePx) ? tileSizePx : null,
    maxRefsPerTile: Number.isFinite(maxRefsPerTile) ? maxRefsPerTile : null,
    viewportWidth: Number.isFinite(viewportWidth) ? viewportWidth : null,
    viewportHeight: Number.isFinite(viewportHeight) ? viewportHeight : null,
    tileColumns,
    tileRows,
    tileCount,
    retainedBudgetRefs,
    retainedBudgetWithinProjectedLimit,
    raisesCap: false,
    diagnostic:
      classification === "guard-misapplied-to-retained-handoff"
        ? "projected-ref guard is accounting dense projected refs before retained-list handoff capacity"
        : "projected-ref guard classification preserves the existing cap and requires explicit policy before routing",
  };
}

export function classifyCompactSourceConstructionBudget(input = {}) {
  const projectedRefs = readNonNegativeFiniteInteger(input.projectedRefs);
  const maxProjectedRefs = readNonNegativeFiniteInteger(input.maxProjectedRefs);
  const retainedBudgetRefs = readNonNegativeFiniteInteger(input.retainedBudgetRefs);
  const anchorTileCount = readNonNegativeFiniteInteger(input.anchorTileCount);
  const presentationScope = input.presentationScope === "anchor-neighborhood" ? "anchor-neighborhood" : "full-scene";
  const forceAnchorOnly = input.forceAnchorOnly === true;
  const allowAnchorOnlyBudgetFallback = input.allowAnchorOnlyBudgetFallback === true;
  const hasRequiredNumbers = [projectedRefs, maxProjectedRefs, retainedBudgetRefs, anchorTileCount].every(Number.isFinite);
  const projectedOverflow = hasRequiredNumbers ? projectedRefs > maxProjectedRefs : null;
  const retainedBudgetWithinProjectedLimit = hasRequiredNumbers ? retainedBudgetRefs <= maxProjectedRefs : null;
  const hasAnchorTiles = Number.isFinite(anchorTileCount) && anchorTileCount > 0;
  const shouldRestrictToAnchorTiles = hasRequiredNumbers &&
    projectedOverflow === true &&
    hasAnchorTiles &&
    (forceAnchorOnly || (allowAnchorOnlyBudgetFallback && retainedBudgetWithinProjectedLimit));
  let classification = "compact-source-underinstrumented";

  if (hasRequiredNumbers && !projectedOverflow) {
    classification = "compact-source-valid";
  } else if (shouldRestrictToAnchorTiles) {
    classification = "compact-source-anchor-bounded-overflow";
  } else if (hasRequiredNumbers) {
    classification = "compact-source-full-scene-overflow";
  }

  return {
    classification,
    guardedQuantity: "compact-source-dense-projected-tile-refs",
    presentationScope,
    projectedRefs: Number.isFinite(projectedRefs) ? projectedRefs : null,
    maxProjectedRefs: Number.isFinite(maxProjectedRefs) ? maxProjectedRefs : null,
    retainedBudgetRefs: Number.isFinite(retainedBudgetRefs) ? retainedBudgetRefs : null,
    anchorTileCount: Number.isFinite(anchorTileCount) ? anchorTileCount : null,
    projectedOverflow,
    retainedBudgetWithinProjectedLimit,
    forceAnchorOnly,
    allowAnchorOnlyBudgetFallback,
    shouldRestrictToAnchorTiles,
    shouldThrowProjectedRefBudgetError: classification === "compact-source-full-scene-overflow",
    projectedRefBudgetOverflow: shouldRestrictToAnchorTiles
      ? {
          projectedRefs,
          maxProjectedRefs,
          mode: "diagnostic-retained-handoff",
        }
      : null,
    diagnostic:
      classification === "compact-source-full-scene-overflow"
        ? "full-scene compact source construction would walk dense projected tile refs before retained-list handoff"
        : "compact source construction is bounded before retained-list handoff or lacks enough evidence to classify",
  };
}

function normalizeSearchParams(input) {
  if (input instanceof URLSearchParams) {
    return input;
  }
  if (typeof input === "string") {
    return new URLSearchParams(input.startsWith("?") ? input.slice(1) : input);
  }
  return new URLSearchParams(input);
}

function readPositiveInteger(value, label) {
  if (!/^[1-9]\d*$/.test(String(value ?? ""))) {
    return `${label} must be a positive integer`;
  }
  return Number(value);
}

function readPositiveFiniteInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number <= 0) {
    return Number.NaN;
  }
  return Math.floor(number);
}

function readNonNegativeFiniteInteger(value) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < 0) {
    return Number.NaN;
  }
  return Math.floor(number);
}

function fallbackConfig(invalidReason) {
  return {
    ...DEFAULT_TILE_LOCAL_BUDGET_CONFIG,
    invalidReason,
  };
}
