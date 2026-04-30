import tileLocalPresentShader from "./shaders/tile_local_present.wgsl?raw";

export interface TileLocalTexturePresenter {
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupLayout: GPUBindGroupLayout;
  draw(pass: GPURenderPassEncoder, sourceView: GPUTextureView): void;
}

export function createTileLocalTexturePresenter(
  device: GPUDevice,
  colorFormat: GPUTextureFormat,
  depthFormat: GPUTextureFormat = "depth32float",
): TileLocalTexturePresenter {
  const shaderModule = device.createShaderModule({
    label: "tile_local_present_shader",
    code: tileLocalPresentShader,
  });
  const sampler = device.createSampler({
    label: "tile_local_present_sampler",
    magFilter: "nearest",
    minFilter: "nearest",
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: "tile_local_present_bind_group_layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.FRAGMENT,
        sampler: { type: "filtering" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.FRAGMENT,
        texture: { sampleType: "float" },
      },
    ],
  });
  const pipeline = device.createRenderPipeline({
    label: "tile_local_present_pipeline",
    layout: device.createPipelineLayout({
      label: "tile_local_present_pipeline_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{ format: colorFormat }],
    },
    primitive: { topology: "triangle-list" },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: false,
      depthCompare: "always",
    },
  });

  return {
    pipeline,
    bindGroupLayout,
    draw(pass: GPURenderPassEncoder, sourceView: GPUTextureView): void {
      const bindGroup = device.createBindGroup({
        label: "tile_local_present_bind_group",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: sourceView },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
    },
  };
}
