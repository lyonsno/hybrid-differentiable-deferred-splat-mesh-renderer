import type { GpuTileContributorArenaProjectedContributor } from "./gpuTileCoverage.js";

export interface CompactProjectionRetentionCandidateSources {
  readonly coverageRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly retentionRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly occlusionRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly supportSampleRecords?: readonly GpuTileContributorArenaProjectedContributor[];
  readonly supportSampleRecordGroups?: readonly (readonly GpuTileContributorArenaProjectedContributor[])[];
}

export function selectCompactProjectionRetentionRecords(
  records: readonly GpuTileContributorArenaProjectedContributor[],
  maxRefsPerTile: number,
  candidateSources?: CompactProjectionRetentionCandidateSources,
): GpuTileContributorArenaProjectedContributor[];

export function compareCompactProjectionRetentionCoverageOrder(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number;

export function compareCompactProjectionRetentionCompositorOrder(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number;

export function compareCompactProjectionRetentionPriority(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number;

export function compareCompactProjectionSupportSamplePriority(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number;

export function compareCompactProjectionOcclusionPriority(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number;

export function compactProjectionRetentionRecordKey(
  contributor: GpuTileContributorArenaProjectedContributor,
): bigint;
