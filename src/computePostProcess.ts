import computePostProcessShader from "./shaders/compute_post_process.wgsl?raw";

export const FXAA_CAS_MAX_SHARPNESS = 1.5;
export const POST_PROCESS_MAX_DOF_STRENGTH = 4;

export type FxaaCasDebugView =
  | "final"
  | "fxaa-mask"
  | "cas-mask"
  | "difference"
  | "depth"
  | "confidence"
  | "dof-mask"
  | "dof-downsample"
  | "dof-blur-h"
  | "dof-blur-v-only"
  | "dof-blur-hv";

const FXAA_CAS_DEBUG_VIEW_CODES: Record<FxaaCasDebugView, number> = {
  final: 0,
  "fxaa-mask": 1,
  "cas-mask": 2,
  difference: 3,
  depth: 4,
  confidence: 5,
  "dof-mask": 6,
  "dof-downsample": 7,
  "dof-blur-h": 8,
  "dof-blur-v-only": 9,
  "dof-blur-hv": 10,
};

export interface FxaaCasPostProcessSettings {
  readonly enabled: boolean;
  readonly fxaaEnabled: boolean;
  readonly casEnabled: boolean;
  readonly sampleRadius: number;
  readonly sampleCount: number;
  readonly casSharpness: number;
  readonly debugView: FxaaCasDebugView;
  readonly dofEnabled: boolean;
  readonly dofFocusDepth: number;
  readonly dofStrength: number;
  readonly dofRadius: number;
  readonly dofLocalEnabled: boolean;
  readonly dofWideEnabled: boolean;
}

export interface FxaaCasPostProcess {
  readonly pipeline: GPUComputePipeline;
  readonly dofDownsamplePipeline: GPUComputePipeline;
  readonly dofBlurHorizontalPipeline: GPUComputePipeline;
  readonly dofBlurVerticalPipeline: GPUComputePipeline;
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly settingsBuffer: GPUBuffer;
  writeSettings(queue: GPUQueue, settings: FxaaCasPostProcessSettings): void;
  encode(
    encoder: GPUCommandEncoder,
    inputView: GPUTextureView,
    inputAuxView: GPUTextureView,
    outputView: GPUTextureView,
    dofLowResView: GPUTextureView,
    dofBlurScratchView: GPUTextureView,
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
      {
        binding: 3,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "unfilterable-float" },
      },
      {
        binding: 4,
        visibility: GPUShaderStage.COMPUTE,
        texture: { sampleType: "unfilterable-float" },
      },
    ],
  });
  const settingsBuffer = device.createBuffer({
    label: "compute_fxaa_cas_post_process_settings",
    size: 64,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  let lastSettings: FxaaCasPostProcessSettings = {
    enabled: true,
    fxaaEnabled: true,
    casEnabled: true,
    sampleRadius: 2,
    sampleCount: 8,
    casSharpness: FXAA_CAS_MAX_SHARPNESS * 0.35,
    debugView: "final",
    dofEnabled: false,
    dofFocusDepth: 0.975,
    dofStrength: POST_PROCESS_MAX_DOF_STRENGTH * 0.35,
    dofRadius: 4,
    dofLocalEnabled: true,
    dofWideEnabled: true,
  };
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
  const dofDownsamplePipeline = device.createComputePipeline({
    label: "compute_dof_downsample",
    layout: device.createPipelineLayout({
      label: "compute_dof_downsample_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "dof_downsample",
    },
  });
  const dofBlurHorizontalPipeline = device.createComputePipeline({
    label: "compute_dof_blur_horizontal",
    layout: device.createPipelineLayout({
      label: "compute_dof_blur_horizontal_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "dof_blur_horizontal",
    },
  });
  const dofBlurVerticalPipeline = device.createComputePipeline({
    label: "compute_dof_blur_vertical",
    layout: device.createPipelineLayout({
      label: "compute_dof_blur_vertical_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "dof_blur_vertical",
    },
  });

  return {
    pipeline,
    dofDownsamplePipeline,
    dofBlurHorizontalPipeline,
    dofBlurVerticalPipeline,
    bindGroupLayout,
    settingsBuffer,
    writeSettings(queue: GPUQueue, settings: FxaaCasPostProcessSettings): void {
      lastSettings = settings;
      const buffer = new ArrayBuffer(64);
      const u32 = new Uint32Array(buffer);
      const f32 = new Float32Array(buffer);
      u32[0] = settings.enabled ? 1 : 0;
      u32[1] = settings.fxaaEnabled ? 1 : 0;
      u32[2] = settings.casEnabled ? 1 : 0;
      u32[3] = clampInteger(settings.sampleRadius, 1, 4);
      u32[4] = clampInteger(settings.sampleCount, 4, 12);
      u32[5] = FXAA_CAS_DEBUG_VIEW_CODES[settings.debugView] ?? FXAA_CAS_DEBUG_VIEW_CODES.final;
      f32[6] = clampNumber(settings.casSharpness, 0, FXAA_CAS_MAX_SHARPNESS);
      u32[7] = settings.dofEnabled ? 1 : 0;
      f32[8] = clampNumber(settings.dofFocusDepth, 0, 1);
      f32[9] = clampNumber(settings.dofStrength, 0, POST_PROCESS_MAX_DOF_STRENGTH);
      u32[10] = clampInteger(settings.dofRadius, 1, 128);
      u32[11] = settings.dofLocalEnabled ? 1 : 0;
      u32[12] = settings.dofWideEnabled ? 1 : 0;
      u32[13] = 0;
      u32[14] = 0;
      u32[15] = 0;
      queue.writeBuffer(settingsBuffer, 0, buffer);
    },
    encode(
      encoder: GPUCommandEncoder,
      inputView: GPUTextureView,
      inputAuxView: GPUTextureView,
      outputView: GPUTextureView,
      dofLowResView: GPUTextureView,
      dofBlurScratchView: GPUTextureView,
      width: number,
      height: number
    ): void {
      const lowResWidth = Math.ceil(width / 2);
      const lowResHeight = Math.ceil(height / 2);
      const debugView = lastSettings.debugView;
      const debugDofDownsample = debugView === "dof-downsample";
      const debugDofBlurH = debugView === "dof-blur-h";
      const debugDofBlurVOnly = debugView === "dof-blur-v-only";
      const debugDofBlurHv = debugView === "dof-blur-hv";
      const debugWidePass = debugDofDownsample || debugDofBlurH || debugDofBlurVOnly || debugDofBlurHv;
      const shouldRunWidePass = lastSettings.dofWideEnabled || debugWidePass;
      const shouldRunHorizontalBlur = shouldRunWidePass && !debugDofDownsample && !debugDofBlurVOnly;
      const shouldRunVerticalOnlyBlur = debugDofBlurVOnly;
      const shouldRunVerticalBlur = shouldRunWidePass && !debugDofDownsample && !debugDofBlurH && !debugDofBlurVOnly;
      const finalDofBlurView = debugDofBlurH || debugDofBlurVOnly ? dofBlurScratchView : dofLowResView;
      const downsampleBindGroup = device.createBindGroup({
        label: "compute_dof_downsample_bg",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: inputView },
          { binding: 1, resource: dofLowResView },
          { binding: 2, resource: { buffer: settingsBuffer } },
          { binding: 3, resource: inputAuxView },
          { binding: 4, resource: inputView },
        ],
      });
      const horizontalBlurBindGroup = device.createBindGroup({
        label: "compute_dof_blur_horizontal_bg",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: dofLowResView },
          { binding: 1, resource: dofBlurScratchView },
          { binding: 2, resource: { buffer: settingsBuffer } },
          { binding: 3, resource: inputAuxView },
          { binding: 4, resource: dofLowResView },
        ],
      });
      const verticalBlurBindGroup = device.createBindGroup({
        label: "compute_dof_blur_vertical_bg",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: dofBlurScratchView },
          { binding: 1, resource: dofLowResView },
          { binding: 2, resource: { buffer: settingsBuffer } },
          { binding: 3, resource: inputAuxView },
          { binding: 4, resource: dofBlurScratchView },
        ],
      });
      const verticalOnlyBlurBindGroup = device.createBindGroup({
        label: "compute_dof_blur_vertical_only_bg",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: dofLowResView },
          { binding: 1, resource: dofBlurScratchView },
          { binding: 2, resource: { buffer: settingsBuffer } },
          { binding: 3, resource: inputAuxView },
          { binding: 4, resource: dofLowResView },
        ],
      });
      const bindGroup = device.createBindGroup({
        label: "compute_fxaa_cas_post_process_bg",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: inputView },
          { binding: 1, resource: outputView },
          { binding: 2, resource: { buffer: settingsBuffer } },
          { binding: 3, resource: inputAuxView },
          { binding: 4, resource: finalDofBlurView },
        ],
      });
      if (shouldRunWidePass) {
        const downsamplePass = encoder.beginComputePass({ label: "compute_dof_downsample" });
        downsamplePass.setPipeline(dofDownsamplePipeline);
        downsamplePass.setBindGroup(0, downsampleBindGroup);
        downsamplePass.dispatchWorkgroups(
          Math.ceil(Math.ceil(width / 2) / 8),
          Math.ceil(Math.ceil(height / 2) / 8)
        );
        downsamplePass.end();
      }

      if (shouldRunHorizontalBlur) {
        const horizontalBlurPass = encoder.beginComputePass({ label: "compute_dof_blur_horizontal" });
        horizontalBlurPass.setPipeline(dofBlurHorizontalPipeline);
        horizontalBlurPass.setBindGroup(0, horizontalBlurBindGroup);
        horizontalBlurPass.dispatchWorkgroups(Math.ceil(lowResWidth / 8), Math.ceil(lowResHeight / 8));
        horizontalBlurPass.end();
      }

      if (shouldRunVerticalOnlyBlur) {
        const verticalOnlyBlurPass = encoder.beginComputePass({ label: "compute_dof_blur_vertical_only" });
        verticalOnlyBlurPass.setPipeline(dofBlurVerticalPipeline);
        verticalOnlyBlurPass.setBindGroup(0, verticalOnlyBlurBindGroup);
        verticalOnlyBlurPass.dispatchWorkgroups(Math.ceil(lowResWidth / 8), Math.ceil(lowResHeight / 8));
        verticalOnlyBlurPass.end();
      }

      if (shouldRunVerticalBlur) {
        const verticalBlurPass = encoder.beginComputePass({ label: "compute_dof_blur_vertical" });
        verticalBlurPass.setPipeline(dofBlurVerticalPipeline);
        verticalBlurPass.setBindGroup(0, verticalBlurBindGroup);
        verticalBlurPass.dispatchWorkgroups(Math.ceil(lowResWidth / 8), Math.ceil(lowResHeight / 8));
        verticalBlurPass.end();
      }

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

export function createPostProcessDofTexture(
  device: GPUDevice,
  width: number,
  height: number,
  label = "compute_compositor_dof_low_res"
): GPUTexture {
  return device.createTexture({
    label,
    size: [Math.ceil(width / 2), Math.ceil(height / 2)],
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
