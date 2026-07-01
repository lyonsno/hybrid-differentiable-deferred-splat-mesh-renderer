import tileLocalPresentShader from "./shaders/tile_local_present.wgsl?raw";
import tileLocalPresentAlphaShader from "./shaders/tile_local_present_alpha.wgsl?raw";
import tileLocalPresentProxyDepthAlphaShader from "./shaders/tile_local_present_proxy_depth_alpha.wgsl?raw";

export interface ProxyDepthPlane {
  readonly centerWorld: readonly [number, number, number];
  readonly normalWorld: readonly [number, number, number];
  readonly radius: number;
  readonly depthBias: number;
}

export interface TileLocalTexturePresenter {
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupLayout: GPUBindGroupLayout;
  draw(pass: GPURenderPassEncoder, sourceView: GPUTextureView): void;
}

export interface ProxyDepthAlphaTexturePresenter {
  readonly pipeline: GPURenderPipeline;
  readonly bindGroupLayout: GPUBindGroupLayout;
  draw(
    pass: GPURenderPassEncoder,
    sourceView: GPUTextureView,
    splatDepthView: GPUTextureView,
    planes: readonly ProxyDepthPlane[],
    viewProj: Float32Array,
    invViewProj: Float32Array,
  ): void;
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

export function createAlphaTexturePresenter(
  device: GPUDevice,
  colorFormat: GPUTextureFormat,
): TileLocalTexturePresenter {
  const shaderModule = device.createShaderModule({
    label: "tile_local_present_alpha_shader",
    code: tileLocalPresentAlphaShader,
  });
  const sampler = device.createSampler({
    label: "tile_local_present_alpha_sampler",
    magFilter: "nearest",
    minFilter: "nearest",
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: "tile_local_present_alpha_bind_group_layout",
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
    label: "tile_local_present_alpha_pipeline",
    layout: device.createPipelineLayout({
      label: "tile_local_present_alpha_pipeline_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{
        format: colorFormat,
        blend: {
          color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });

  return {
    pipeline,
    bindGroupLayout,
    draw(pass: GPURenderPassEncoder, sourceView: GPUTextureView): void {
      const bindGroup = device.createBindGroup({
        label: "tile_local_present_alpha_bind_group",
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

export function createProxyDepthAlphaTexturePresenter(
  device: GPUDevice,
  colorFormat: GPUTextureFormat,
): ProxyDepthAlphaTexturePresenter {
  const shaderModule = device.createShaderModule({
    label: "tile_local_present_proxy_depth_alpha_shader",
    code: tileLocalPresentProxyDepthAlphaShader,
  });
  const sampler = device.createSampler({
    label: "tile_local_present_proxy_depth_alpha_sampler",
    magFilter: "nearest",
    minFilter: "nearest",
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: "tile_local_present_proxy_depth_alpha_bind_group_layout",
    entries: [
      { binding: 0, visibility: GPUShaderStage.FRAGMENT, sampler: { type: "filtering" } },
      { binding: 1, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "float" } },
      { binding: 2, visibility: GPUShaderStage.FRAGMENT, texture: { sampleType: "unfilterable-float" } },
      { binding: 3, visibility: GPUShaderStage.FRAGMENT, buffer: { type: "uniform" } },
    ],
  });
  const pipeline = device.createRenderPipeline({
    label: "tile_local_present_proxy_depth_alpha_pipeline",
    layout: device.createPipelineLayout({
      label: "tile_local_present_proxy_depth_alpha_pipeline_layout",
      bindGroupLayouts: [bindGroupLayout],
    }),
    vertex: { module: shaderModule, entryPoint: "vs" },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [{
        format: colorFormat,
        blend: {
          color: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
          alpha: { srcFactor: "one", dstFactor: "one-minus-src-alpha", operation: "add" },
        },
      }],
    },
    primitive: { topology: "triangle-list" },
  });
  const uniformBuffer = device.createBuffer({
    label: "tile_local_present_proxy_depth_alpha_uniforms",
    size: 272,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const uniformData = new Float32Array(68);

  return {
    pipeline,
    bindGroupLayout,
    draw(
      pass: GPURenderPassEncoder,
      sourceView: GPUTextureView,
      splatDepthView: GPUTextureView,
      planes: readonly ProxyDepthPlane[],
      viewProj: Float32Array,
      invViewProj: Float32Array,
    ): void {
      uniformData.fill(0);
      uniformData.set(viewProj, 0);
      uniformData.set(invViewProj, 16);
      uniformData[32] = Math.min(planes.length, 4);
      for (let i = 0; i < Math.min(planes.length, 4); i++) {
        const offset = 36 + i * 8;
        const plane = planes[i];
        uniformData[offset + 0] = plane.centerWorld[0];
        uniformData[offset + 1] = plane.centerWorld[1];
        uniformData[offset + 2] = plane.centerWorld[2];
        uniformData[offset + 3] = plane.radius;
        uniformData[offset + 4] = plane.normalWorld[0];
        uniformData[offset + 5] = plane.normalWorld[1];
        uniformData[offset + 6] = plane.normalWorld[2];
        uniformData[offset + 7] = plane.depthBias;
      }
      device.queue.writeBuffer(uniformBuffer, 0, uniformData);
      const bindGroup = device.createBindGroup({
        label: "tile_local_present_proxy_depth_alpha_bind_group",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: sampler },
          { binding: 1, resource: sourceView },
          { binding: 2, resource: splatDepthView },
          { binding: 3, resource: { buffer: uniformBuffer } },
        ],
      });
      pass.setPipeline(pipeline);
      pass.setBindGroup(0, bindGroup);
      pass.draw(3);
    },
  };
}
