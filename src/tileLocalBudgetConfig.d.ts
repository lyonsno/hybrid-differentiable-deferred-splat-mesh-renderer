export interface TileLocalBudgetConfig {
  readonly tileSizePx: number;
  readonly maxRefsPerTile: number;
  readonly invalidReason?: string;
}

export const DEFAULT_TILE_LOCAL_BUDGET_CONFIG: TileLocalBudgetConfig;

export function resolveTileLocalBudgetConfig(
  input?: string | URLSearchParams | Record<string, string>
): TileLocalBudgetConfig;

export function formatTileLocalBudgetPair(config: TileLocalBudgetConfig): string;

export interface TileLocalProjectedRefGuardInput {
  readonly requestedArenaBackend?: string;
  readonly handoffSource?: string;
  readonly projectedRefs?: number;
  readonly maxProjectedRefs?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly tileSizePx?: number;
  readonly maxRefsPerTile?: number;
}

export interface TileLocalProjectedRefGuardClassification {
  readonly classification:
    | "guard-valid-blocker"
    | "guard-misapplied-to-retained-handoff"
    | "guard-needs-dynamic-budget"
    | "guard-underinstrumented";
  readonly guardedQuantity: "dense-projected-tile-refs";
  readonly handoffQuantity: "dense-projected-tile-refs" | "per-tile-retained-ref-capacity";
  readonly requestedArenaBackend: string;
  readonly handoffSource: string;
  readonly projectedRefs: number | null;
  readonly maxProjectedRefs: number | null;
  readonly projectedOverflow: boolean | null;
  readonly tileSizePx: number | null;
  readonly maxRefsPerTile: number | null;
  readonly viewportWidth: number | null;
  readonly viewportHeight: number | null;
  readonly tileColumns: number | null;
  readonly tileRows: number | null;
  readonly tileCount: number | null;
  readonly retainedBudgetRefs: number | null;
  readonly retainedBudgetWithinProjectedLimit: boolean | null;
  readonly raisesCap: false;
  readonly diagnostic: string;
}

export function classifyTileLocalProjectedRefGuard(
  input?: TileLocalProjectedRefGuardInput
): TileLocalProjectedRefGuardClassification;
