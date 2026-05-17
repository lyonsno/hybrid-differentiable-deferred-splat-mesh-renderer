export type TileLocalCoverageDispatchMode = "full-coverage-pipeline" | "composite-only";

export interface TileLocalCoverageDispatchPolicyInput {
  readonly rendererMode?: string;
  readonly arenaBackend?: string;
  readonly hasGpuArenaRuntime?: boolean;
}

export function selectTileLocalCoverageDispatchMode(
  input?: TileLocalCoverageDispatchPolicyInput,
): TileLocalCoverageDispatchMode;
