export interface LiveCompositorBufferReadbackSummary {
  readonly classification: "buffer-readback-complete" | "buffer-readback-underinstrumented";
  readonly observation: Record<string, unknown>;
  readonly readbackStage: string;
  readonly frameId: number | null;
  readonly missingFields: readonly string[];
  readonly rows: readonly Record<string, unknown>[];
}

export function summarizeLiveCompositorBufferReadback(input?: Record<string, unknown>): LiveCompositorBufferReadbackSummary;
