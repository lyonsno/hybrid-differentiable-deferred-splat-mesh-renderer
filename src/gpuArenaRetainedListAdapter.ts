import type {
  DeterministicGpuTileProjectionRetentionArena,
  GpuTileContributorArenaProjectedContributor,
  GpuTileProjectionRetentionArenaBuildInput,
} from "./gpuTileCoverage.js";
import type { GpuTileCoverageBridge } from "./gpuTileCoverageBridge.js";

export interface GpuArenaRetainedListAdapterResult {
  readonly contributors: readonly GpuTileContributorArenaProjectedContributor[];
  readonly projectedContributorCount: number;
  readonly retainedContributorCount: number;
  readonly droppedContributorCount: number;
}

export type GpuProjectionRetentionArenaBuilder = (
  input: GpuTileProjectionRetentionArenaBuildInput,
) => DeterministicGpuTileProjectionRetentionArena;

export function adaptGpuArenaRetainedContributors(
  bridge: Pick<GpuTileCoverageBridge, "contributorArena" | "retainedTileEntryCount" | "tileEntryCount" | "tileRefCustody" | "maxRefsPerTile">,
  effectiveOpacities: Float32Array,
  buildProjectionRetentionArena?: GpuProjectionRetentionArenaBuilder,
): GpuArenaRetainedListAdapterResult {
  const retainedRecords = bridge.contributorArena?.contributors ?? [];
  const projectedContributorCount = bridge.contributorArena?.projectedContributors?.length
    ?? bridge.tileRefCustody.projectedTileEntryCount
    ?? retainedRecords.length;
  const projectedRecords = bridge.contributorArena?.projectedContributors;
  if (Array.isArray(projectedRecords) && projectedRecords.length > 0 && buildProjectionRetentionArena) {
    const projectedContributors = projectedRecords.map((record) => normalizeProjectedContributor(record, effectiveOpacities));
    const arena = buildProjectionRetentionArena({
      tileCount: bridge.contributorArena?.tileHeaders?.length ?? inferTileCount(projectedContributors),
      maxContributors: projectedContributors.length,
      maxRefsPerTile: bridge.maxRefsPerTile ?? bridge.tileRefCustody.maxRetainedRefsPerTile ?? bridge.retainedTileEntryCount,
      contributors: projectedContributors,
    });
    return {
      contributors: arena.retainedRecords,
      projectedContributorCount: arena.projectedContributorCount,
      retainedContributorCount: arena.retainedContributorCount,
      droppedContributorCount: arena.droppedContributorCount,
    };
  }

  const contributors = retainedRecords.map((record) => {
    const effectiveOpacity = effectiveOpacities[record.splatIndex];
    return normalizeProjectedContributor(record, effectiveOpacities, effectiveOpacity);
  });

  return {
    contributors,
    projectedContributorCount,
    retainedContributorCount: contributors.length,
    droppedContributorCount: Math.max(0, projectedContributorCount - contributors.length),
  };
}

function normalizeProjectedContributor(
  record: GpuTileContributorArenaProjectedContributor,
  effectiveOpacities: Float32Array,
  effectiveOpacity = effectiveOpacities[record.splatIndex],
): GpuTileContributorArenaProjectedContributor {
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
    occlusionDensity: record.occlusionDensity,
    supportSampleWeight: record.supportSampleWeight,
    supportSampleRetentionWeight: record.supportSampleRetentionWeight,
  };
}

function inferTileCount(contributors: readonly GpuTileContributorArenaProjectedContributor[]): number {
  let maxTileIndex = -1;
  for (const contributor of contributors) {
    maxTileIndex = Math.max(maxTileIndex, contributor.tileIndex);
  }
  return maxTileIndex + 1;
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
