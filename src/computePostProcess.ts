import computePostProcessShader from "./shaders/compute_post_process.wgsl?raw";

export interface FxaaCasPostProcess {
  readonly pipeline: GPUComputePipeline;
  readonly bindGroupLayout: GPUBindGroupLayout;
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
    ],
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
