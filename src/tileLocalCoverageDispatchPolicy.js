export function selectTileLocalCoverageDispatchMode({
  rendererMode,
  arenaBackend,
  hasGpuArenaRuntime = false,
} = {}) {
  if (rendererMode === "tile-local-visible" && (arenaBackend !== "gpu" || hasGpuArenaRuntime)) {
    return "composite-only";
  }
  return "full-coverage-pipeline";
}
