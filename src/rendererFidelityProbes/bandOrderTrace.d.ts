import type { GpuTileContributorArenaProjectedContributor } from "../gpuTileCoverage.js";

export interface BandDispatchCacheTrace {
  readonly tileIndex: number;
  readonly clearFrameId: number;
  readonly buildFrameId: number;
  readonly compositeFrameId: number;
  readonly tileY: number;
  readonly tileSpan: {
    readonly minTileX: number;
    readonly maxTileX: number;
    readonly minTileY: number;
    readonly maxTileY: number;
  };
  readonly cacheState: string;
  readonly presentationFrameId: number;
  readonly rowDispatchState: {
    readonly tileCoveredByClear: boolean;
    readonly tileCoveredByBuild: boolean;
    readonly tileCoveredByComposite: boolean;
    readonly rowCoveredByComposite: boolean;
    readonly currentFrameComplete: boolean;
  };
}

export interface BandPixelOrderTraceRecord {
  readonly schemaVersion: number;
  readonly anchorPixel: {
    readonly id: string;
    readonly kind: string;
    readonly x: number;
    readonly y: number;
  };
  readonly tileAddress: {
    readonly tileSizePx: number;
    readonly tileX: number;
    readonly tileY: number;
    readonly tileIndex: number;
    readonly localX: number;
    readonly localY: number;
  };
  readonly projectedContributors: readonly unknown[];
  readonly retainedContributors: readonly unknown[];
  readonly orderedContributors: readonly {
    readonly splatIndex: number;
    readonly originalId: number;
    readonly orderIndex: number;
    readonly viewRank: number;
    readonly viewDepth: number;
    readonly tieBreakKey: string;
    readonly orderBackend: string;
  }[];
  readonly finalColorAccumulation: {
    readonly steps: readonly unknown[];
    readonly outputColor: readonly [number, number, number, number];
  };
  readonly dispatchCache: BandDispatchCacheTrace;
  readonly rendererMetadata: Record<string, unknown>;
  readonly deferredFields: Record<string, unknown>;
  readonly blockers: readonly {
    readonly field: string;
    readonly reason: string;
  }[];
}

export type BandDropoutMechanismClassification =
  | "dispatch-cache"
  | "order-rank"
  | "final-accumulation"
  | "conic-alpha-side-effect"
  | "narrower-blocker";

export interface BandDropoutMechanismVerdict {
  readonly classification: BandDropoutMechanismClassification;
  readonly provisional: boolean;
  readonly reason: string;
  readonly affectedRows: readonly number[];
  readonly affectedTiles: readonly number[];
  readonly blocker?: string;
  readonly evidence: Record<string, unknown>;
}

export const BAND_ORDER_BACKEND: string;
export const BLACK_BAND_TRACE_ANCHOR: {
  readonly id: string;
  readonly kind: string;
  readonly x: number;
  readonly y: number;
  readonly canonicalTileAddress: {
    readonly tileX: number;
    readonly tileY: number;
    readonly tileIndex: number;
    readonly localX: number;
    readonly localY: number;
  };
};

export function buildBandPixelOrderTraceRecord(input?: {
  readonly contributors?: readonly Partial<GpuTileContributorArenaProjectedContributor>[];
  readonly dispatchCache?: BandDispatchCacheTrace;
  readonly rendererMetadata?: Record<string, unknown>;
  readonly tileSizePx?: number;
}): BandPixelOrderTraceRecord;

export function selectBandPixelOrderedContributors(
  contributors: readonly Partial<GpuTileContributorArenaProjectedContributor>[],
  tileAddress?: BandPixelOrderTraceRecord["tileAddress"],
): BandPixelOrderTraceRecord["orderedContributors"];

export function buildBandDispatchCacheTrace(input?: {
  readonly tileColumns?: number;
  readonly tileRows?: number;
  readonly tileSizePx?: number;
  readonly viewportWidth?: number;
  readonly viewportHeight?: number;
  readonly currentFrameId?: number;
  readonly clearFrameId?: number;
  readonly buildFrameId?: number;
  readonly compositeFrameId?: number;
  readonly cacheState?: string;
  readonly tileSpan?: BandDispatchCacheTrace["tileSpan"];
}): BandDispatchCacheTrace;

export function classifyBandDropoutMechanism(input?: {
  readonly anchorPixel?: typeof BLACK_BAND_TRACE_ANCHOR;
  readonly tileAddress?: BandPixelOrderTraceRecord["tileAddress"];
  readonly dispatchCache?: BandDispatchCacheTrace;
  readonly orderedContributors?: BandPixelOrderTraceRecord["orderedContributors"];
  readonly finalColorAccumulation?: {
    readonly steps?: readonly Record<string, unknown>[];
    readonly outputColor?: readonly number[];
  };
  readonly traceSource?: string;
  readonly gpuLiveTraceAvailable?: boolean;
}): BandDropoutMechanismVerdict;
