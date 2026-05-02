export type TileLocalContributorFieldUse =
  | "current-final-color-only"
  | "shared-current-and-deferred"
  | "future-deferred-surface-input"
  | "unknown";

export interface TileLocalContributorFieldDefinition {
  readonly name: string;
  readonly type: string;
  readonly description: string;
}

export interface TileLocalContributorOverflowAssignment {
  readonly reason: string;
  readonly bit: number;
  readonly description: string;
}

export interface TileLocalContributorArenaContract {
  readonly version: 1;
  readonly tileHeader: {
    readonly uint32Stride: number;
    readonly float32Stride: number;
    readonly fields: readonly TileLocalContributorFieldDefinition[];
  };
  readonly contributorRecord: {
    readonly uint32Stride: number;
    readonly float32Stride: number;
    readonly fields: readonly TileLocalContributorFieldDefinition[];
  };
  readonly overflow: {
    readonly bitAssignments: readonly TileLocalContributorOverflowAssignment[];
  };
  readonly fieldUse: Readonly<Record<string, TileLocalContributorFieldUse>>;
  readonly legacyCompatibility: {
    readonly tileHeaders: string;
    readonly tileRefs: string;
    readonly tileCoverageWeights: string;
    readonly tileRefShapeParams: string;
  };
}

export interface TileLocalContributorArenaContractSummary {
  readonly version: 1;
  readonly headerFields: readonly string[];
  readonly recordFields: readonly string[];
  readonly overflowReasons: readonly string[];
  readonly legacyCompatibility: TileLocalContributorArenaContract["legacyCompatibility"];
}

export declare const TILE_LOCAL_CONTRIBUTOR_ARENA_CONTRACT: TileLocalContributorArenaContract;

export function classifyTileLocalContributorFieldUse(fieldName: string): TileLocalContributorFieldUse;

export function summarizeTileLocalContributorArenaContract(
  contract?: TileLocalContributorArenaContract,
): TileLocalContributorArenaContractSummary;

export function validateTileLocalContributorArenaContract(
  contract?: TileLocalContributorArenaContract,
): readonly string[];
