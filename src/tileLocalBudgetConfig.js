export const DEFAULT_TILE_LOCAL_BUDGET_CONFIG = Object.freeze({
  tileSizePx: 6,
  maxRefsPerTile: 32,
});

export function resolveTileLocalBudgetConfig(input = "") {
  const params = normalizeSearchParams(input);
  const hasTileSize = params.has("tileSizePx");
  const hasMaxRefs = params.has("maxRefsPerTile");
  if (hasTileSize !== hasMaxRefs) {
    throw new Error("tileSizePx and maxRefsPerTile must be provided together");
  }
  if (!hasTileSize) {
    return { ...DEFAULT_TILE_LOCAL_BUDGET_CONFIG };
  }
  return {
    tileSizePx: readPositiveInteger(params.get("tileSizePx"), "tileSizePx"),
    maxRefsPerTile: readPositiveInteger(params.get("maxRefsPerTile"), "maxRefsPerTile"),
  };
}

export function formatTileLocalBudgetPair(config) {
  return `${config.tileSizePx}px/${config.maxRefsPerTile} refs`;
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
    throw new Error(`${label} must be a positive integer`);
  }
  return Number(value);
}
