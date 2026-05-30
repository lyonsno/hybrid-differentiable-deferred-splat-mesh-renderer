import type { GpuTileContributorArenaProjectedContributor } from "./gpuTileCoverage.js";

const PACKED_CONTRIBUTOR_RECORD_UINT32_STRIDE = 8;
const PACKED_CONTRIBUTOR_RECORD_FLOAT32_STRIDE = 16;

export function orderGpuArenaContributorsForLegacyStorage(
  contributors: readonly GpuTileContributorArenaProjectedContributor[],
): readonly GpuTileContributorArenaProjectedContributor[] {
  return [...contributors].sort(compareGpuArenaContributorStorageOrder);
}

export function packGpuArenaProjectedContributors(contributors: readonly GpuTileContributorArenaProjectedContributor[]): {
  readonly u32: Uint32Array;
  readonly f32: Float32Array;
} {
  const orderedContributors = orderGpuArenaContributorsForLegacyStorage(contributors);
  const u32 = new Uint32Array(Math.max(1, orderedContributors.length) * PACKED_CONTRIBUTOR_RECORD_UINT32_STRIDE);
  const f32 = new Float32Array(Math.max(1, orderedContributors.length) * PACKED_CONTRIBUTOR_RECORD_FLOAT32_STRIDE);
  orderedContributors.forEach((contributor, index) => {
    const u32Base = index * PACKED_CONTRIBUTOR_RECORD_UINT32_STRIDE;
    const f32Base = index * PACKED_CONTRIBUTOR_RECORD_FLOAT32_STRIDE;
    u32[u32Base] = contributor.splatIndex;
    u32[u32Base + 1] = contributor.originalId;
    u32[u32Base + 2] = contributor.tileIndex;
    u32[u32Base + 3] = index;
    u32[u32Base + 4] = contributor.viewRank;
    f32[f32Base] = contributor.viewDepth;
    f32[f32Base + 1] = contributor.depthBand;
    f32[f32Base + 2] = contributor.coverageWeight;
    f32[f32Base + 3] = contributor.centerPx[0];
    f32[f32Base + 4] = contributor.centerPx[1];
    f32[f32Base + 5] = contributor.inverseConic[0];
    f32[f32Base + 6] = contributor.inverseConic[1];
    f32[f32Base + 7] = contributor.inverseConic[2];
    f32[f32Base + 8] = contributor.opacity;
    f32[f32Base + 9] = contributor.coverageAlpha;
    f32[f32Base + 10] = contributor.transmittanceBefore;
    f32[f32Base + 11] = contributor.retentionWeight;
    f32[f32Base + 12] = contributor.occlusionWeight;
  });
  return { u32, f32 };
}

function compareGpuArenaContributorStorageOrder(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  return (
    left.tileIndex - right.tileIndex ||
    left.viewRank - right.viewRank ||
    left.viewDepth - right.viewDepth ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}
