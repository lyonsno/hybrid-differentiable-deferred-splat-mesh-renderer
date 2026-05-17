export type CompositorBufferTraceParityClassification =
  | "buffer-matches-trace"
  | "buffer-identity-divergence"
  | "buffer-order-divergence"
  | "buffer-coverage-alpha-divergence"
  | "buffer-source-payload-divergence"
  | "buffer-underinstrumented"
  | "narrower-blocker";

export interface CompositorBufferTraceParityInput {
  traceFinalRows?: unknown[];
  liveBufferRows?: unknown[];
  tolerance?: number;
}

export interface CompositorBufferTraceParitySummary {
  version: number;
  classification: CompositorBufferTraceParityClassification;
  anchorCount: number;
  perAnchor: Array<{
    anchorId: string;
    status: CompositorBufferTraceParityClassification;
    anchorPixel: unknown;
    tileAddress: unknown;
    missingFields: string[];
    contributorIds: number[];
    order: number[];
    traceContributorCount?: number;
    bufferContributorCount?: number;
    missingTraceIdentitySample?: Array<{ splatIndex: number; originalId: number }>;
    extraBufferIdentitySample?: Array<{ splatIndex: number; originalId: number }>;
    firstDivergentOrderIndex?: number;
    firstCoverageAlphaMismatch?: unknown;
    firstSourcePayloadMismatch?: unknown;
    liveWindowStatus?: string | null;
    liveRefCapacity?: number;
    headerOffset?: number;
    headerCount?: number;
    scatterCount?: number;
    refCount?: number;
    requestedEnd?: number;
    truncatedCount?: number;
  }>;
}

export function classifyCompositorBufferTraceParity(
  input?: CompositorBufferTraceParityInput,
): CompositorBufferTraceParitySummary;
