export interface TileLocalBudgetConfig {
  readonly tileSizePx: number;
  readonly maxRefsPerTile: number;
}

export const DEFAULT_TILE_LOCAL_BUDGET_CONFIG: TileLocalBudgetConfig;

export function resolveTileLocalBudgetConfig(
  input?: string | URLSearchParams | Record<string, string>
): TileLocalBudgetConfig;

export function formatTileLocalBudgetPair(config: TileLocalBudgetConfig): string;
