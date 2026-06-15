import computePostProcessShader from "./shaders/compute_post_process.wgsl?raw";

export const FXAA_CAS_MAX_SHARPNESS = 1.5;

export interface FxaaCasPostProcessSettings {
  readonly enabled: boolean;
  readonly fxaaEnabled: boolean;
  readonly casEnabled: boolean;
  readonly sampleRadius: number;
  readonly casSharpness: number;
}

export interface FxaaCasPostProcess {
  readonly pipeline: GPUComputePipeline;
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly settingsBuffer: GPUBuffer;
  writeSettings(queue: GPUQueue, settings: FxaaCasPostProcessSettings): void;
  encode(
    encoder: GPUCommandEncoder,
    inputView: GPUTextureView,
    outputView: GPUTextureView,
    width: number,
    height: number
  ): void;
}

export function createFxaaCasPostProcess(device: GPUDevice): FxaaCasPostProcess {
  const shaderModule = device.createShaderModule({
    label: "compute_fxaa_cas_post_process_shader",
    code: computePostProcessShader,
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: "compute_fxaa_cas_post_process_bgl",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "unfilterable-float" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: { access: "write-only", format: "rgba16float" },
      },
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });
  const settingsBuffer = device.createBuffer({
    label: "compute_fxaa_cas_post_process_settings",
    size: 32,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const pipeline = device.createComputePipeline({
    label: "compute_fxaa_cas_post_process",
    layout: device.createPipelineLayout({
      label: "compute_fxaa_cas_post_process_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "fxaa_cas_post_process",
    },
  });

  return {
    pipeline,
    bindGroupLayout,
    settingsBuffer,
    writeSettings(queue: GPUQueue, settings: FxaaCasPostProcessSettings): void {
      const buffer = new ArrayBuffer(32);
      const u32 = new Uint32Array(buffer);
      const f32 = new Float32Array(buffer);
      u32[0] = settings.enabled ? 1 : 0;
      u32[1] = settings.fxaaEnabled ? 1 : 0;
      u32[2] = settings.casEnabled ? 1 : 0;
      u32[3] = clampInteger(settings.sampleRadius, 1, 4);
      f32[4] = clampNumber(settings.casSharpness, 0, FXAA_CAS_MAX_SHARPNESS);
      queue.writeBuffer(settingsBuffer, 0, buffer);
    },
    encode(
      encoder: GPUCommandEncoder,
      inputView: GPUTextureView,
      outputView: GPUTextureView,
      width: number,
      height: number
    ): void {
      const bindGroup = device.createBindGroup({
        label: "compute_fxaa_cas_post_process_bg",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: inputView },
          { binding: 1, resource: outputView },
          { binding: 2, resource: { buffer: settingsBuffer } },
        ],
      });
      const pass = encoder.beginComputePass({ label: "compute_fxaa_cas_post_process" });
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

export function createPostProcessOutputTexture(
  device: GPUDevice,
  width: number,
  height: number,
  label = "compute_compositor_post_process_output"
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
  return Math.max(min, Math.min(max, Math.round(value)));
}

function clampNumber(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) {
    return min;
  }
  return Math.max(min, Math.min(max, value));
}
