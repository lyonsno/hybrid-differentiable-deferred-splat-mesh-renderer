import temporalResolveShader from "./shaders/temporal_resolve.wgsl?raw";

export type TemporalResolveMode = "off" | "idle" | "always";
export type TemporalResolveDebugView = "final" | "history-weight" | "difference";

const TEMPORAL_DEBUG_VIEW_CODES: Record<TemporalResolveDebugView, number> = {
  final: 0,
  "history-weight": 1,
  difference: 2,
};

export interface TemporalResolveSettings {
  readonly mode: TemporalResolveMode;
  readonly maxHistoryFrames: number;
  readonly debugView: TemporalResolveDebugView;
}

export interface TemporalResolveDispatchSettings {
  readonly historyFrameCount: number;
  readonly maxHistoryFrames: number;
  readonly debugView: TemporalResolveDebugView;
}

export interface TemporalResolve {
  readonly pipeline: GPUComputePipeline;
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly settingsBuffer: GPUBuffer;
  writeSettings(queue: GPUQueue, settings: TemporalResolveDispatchSettings): void;
  encode(
    encoder: GPUCommandEncoder,
    currentView: GPUTextureView,
    historyView: GPUTextureView,
    outputView: GPUTextureView,
    width: number,
    height: number
  ): void;
}

export function createTemporalResolve(device: GPUDevice): TemporalResolve {
  const shaderModule = device.createShaderModule({
    label: "temporal_resolve_shader",
    code: temporalResolveShader,
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: "temporal_resolve_bgl",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "unfilterable-float" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "unfilterable-float" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: { access: "write-only", format: "rgba16float" },
      },
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });
  const settingsBuffer = device.createBuffer({
    label: "temporal_resolve_settings",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const pipeline = device.createComputePipeline({
    label: "temporal_resolve",
    layout: device.createPipelineLayout({
      label: "temporal_resolve_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "temporal_resolve",
    },
  });

  return {
    pipeline,
    bindGroupLayout,
    settingsBuffer,
    writeSettings(queue: GPUQueue, settings: TemporalResolveDispatchSettings): void {
      const buffer = new ArrayBuffer(16);
      const u32 = new Uint32Array(buffer);
      u32[0] = clampInteger(settings.historyFrameCount, 0, 64);
      u32[1] = clampInteger(settings.maxHistoryFrames, 1, 64);
      u32[2] = TEMPORAL_DEBUG_VIEW_CODES[settings.debugView] ?? TEMPORAL_DEBUG_VIEW_CODES.final;
      u32[3] = 0;
      queue.writeBuffer(settingsBuffer, 0, buffer);
    },
    encode(
      encoder: GPUCommandEncoder,
      currentView: GPUTextureView,
      historyView: GPUTextureView,
      outputView: GPUTextureView,
      width: number,
      height: number
    ): void {
      const bindGroup = device.createBindGroup({
        label: "temporal_resolve_bg",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: currentView },
          { binding: 1, resource: historyView },
          { binding: 2, resource: outputView },
          { binding: 3, resource: { buffer: settingsBuffer } },
        ],
      });
      const pass = encoder.beginComputePass({ label: "temporal_resolve" });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.dispatchWorkgroups(
        Math.ceil(width / 8),
        Math.ceil(height / 8)
      );
      pass.end();
    },
  };
}

export function createTemporalResolveTexture(
  device: GPUDevice,
  width: number,
  height: number,
  label = "temporal_resolve_history"
): GPUTexture {
  return device.createTexture({
    label,
    size: [width, height],
    format: "rgba16float",
    usage: GPUTextureUsage.STORAGE_BINDING | GPUTextureUsage.TEXTURE_BINDING,
  });
}

function clampInteger(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.trunc(Math.min(max, Math.max(min, value)));
}
