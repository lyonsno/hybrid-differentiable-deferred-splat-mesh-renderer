export type CompositorBufferAddressClassification =
  | "address-contract-ok"
  | "dense-index-consumed-as-compact-offset"
  | "compact-list-not-populated"
  | "header-capacity-mismatch"
  | "address-underinstrumented";

export interface CompositorBufferAddressContractInput {
  readonly anchorId?: string;
  readonly tileIndex?: number;
  readonly headerOffset?: number;
  readonly headerCount?: number;
  readonly scatterCount?: number;
  readonly refCount?: number;
  readonly liveRefCapacity?: number;
  readonly tileCapacity?: number;
  readonly traceExpectedContributorCount?: number;
}

export interface CompositorBufferAddressContractRow {
  readonly anchorId: string;
  readonly classification: CompositorBufferAddressClassification;
  readonly tileIndex: number | null;
  readonly headerOffset: number | null;
  readonly headerCount: number | null;
  readonly scatterCount: number | null;
  readonly effectiveCount: number | null;
  readonly refCount: number | null;
  readonly liveRefCapacity: number | null;
  readonly tileCapacity: number | null;
  readonly denseTileSlotOffset: number | null;
  readonly requestedEnd: number | null;
  readonly capacityOverrun: number | null;
  readonly traceExpectedContributorCount: number | null;
}

export interface CompositorBufferAddressContractSummary {
  readonly classification: CompositorBufferAddressClassification;
  readonly rowCount: number;
  readonly countsByClassification: Record<CompositorBufferAddressClassification, number>;
  readonly rows: readonly CompositorBufferAddressContractRow[];
}

export function classifyCompositorBufferAddressContract(
  input: CompositorBufferAddressContractInput,
): CompositorBufferAddressContractRow;

export function summarizeCompositorBufferAddressContract(
  rows: readonly CompositorBufferAddressContractRow[],
): CompositorBufferAddressContractSummary;
