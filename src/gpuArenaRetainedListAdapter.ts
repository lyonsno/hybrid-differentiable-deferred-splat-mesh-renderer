import type { GpuTileContributorArenaProjectedContributor } from "./gpuTileCoverage.js";
import type { GpuTileCoverageBridge } from "./gpuTileCoverageBridge.js";

export interface GpuArenaRetainedListAdapterResult {
  readonly contributors: readonly GpuTileContributorArenaProjectedContributor[];
  readonly projectedContributorCount: number;
  readonly retainedContributorCount: number;
  readonly droppedContributorCount: number;
}

export function adaptGpuArenaRetainedContributors(
  bridge: Pick<GpuTileCoverageBridge, "contributorArena" | "retainedTileEntryCount" | "tileEntryCount" | "tileRefCustody">,
  effectiveOpacities: Float32Array,
): GpuArenaRetainedListAdapterResult {
  const retainedRecords = bridge.contributorArena?.contributors ?? [];
  const projectedContributorCount = bridge.contributorArena?.projectedContributors?.length
    ?? bridge.tileRefCustody.projectedTileEntryCount
    ?? retainedRecords.length;
  const contributors = retainedRecords.map((record) => {
    const effectiveOpacity = effectiveOpacities[record.splatIndex];
    return {
      splatIndex: record.splatIndex,
      originalId: record.originalId,
      tileIndex: record.tileIndex,
      viewRank: record.viewRank,
      viewDepth: record.viewDepth,
      depthBand: record.depthBand,
      coverageWeight: record.coverageWeight,
      centerPx: tuple2(record.centerPx),
      inverseConic: tuple3(record.inverseConic),
      opacity: Number.isFinite(effectiveOpacity) ? effectiveOpacity : record.opacity,
      coverageAlpha: record.coverageAlpha,
      transmittanceBefore: record.transmittanceBefore,
      retentionWeight: record.retentionWeight,
      occlusionWeight: record.occlusionWeight,
    };
  });

  return {
    contributors,
    projectedContributorCount,
    retainedContributorCount: contributors.length,
    droppedContributorCount: Math.max(0, projectedContributorCount - contributors.length),
  };
}

function tuple2(values: readonly number[]): readonly [number, number] {
  return [finiteOrZero(values[0]), finiteOrZero(values[1])];
}

function tuple3(values: readonly number[]): readonly [number, number, number] {
  return [finiteOrZero(values[0]), finiteOrZero(values[1]), finiteOrZero(values[2])];
}

function finiteOrZero(value: number | undefined): number {
  return typeof value === "number" && Number.isFinite(value) ? value : 0;
}
