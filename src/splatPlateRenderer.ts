import splatPlateShader from "./shaders/splat_plate.wgsl?raw";
import {
  getSplatPlateDrawCall,
  SPLAT_PLATE_FRAME_UNIFORM_BYTES,
  SPLAT_PLATE_VERTICES_PER_SPLAT,
  writeSplatPlateFrameUniforms,
} from "./splatPlateContract.js";

export {
  getSplatPlateDrawCall,
  SPLAT_PLATE_FRAME_UNIFORM_BYTES,
  SPLAT_PLATE_SPLAT_ROW_BYTES,
  SPLAT_PLATE_VERTICES_PER_SPLAT,
  writeSplatPlateFrameUniforms,
} from "./splatPlateContract.js";

export interface SplatPlateBuffers {
  splatBuffer: GPUBuffer;
  sortedIndexBuffer: GPUBuffer;
}

export interface SplatPlateRenderer {
  pipeline: GPURenderPipeline;
  bindGroupLayout: GPUBindGroupLayout;
  createBindGroup(buffers: SplatPlateBuffers): GPUBindGroup;
  draw(pass: GPURenderPassEncoder, bindGroup: GPUBindGroup, splatCount: number): void;
}

export function createSplatPlateRenderer(
  device: GPUDevice,
  colorFormat: GPUTextureFormat,
  frameBindGroupLayout: GPUBindGroupLayout,
  depthFormat: GPUTextureFormat = "depth32float"
): SplatPlateRenderer {
  const shaderModule = device.createShaderModule({
    label: "splat_plate_shader",
    code: splatPlateShader,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    label: "splat_plate_bind_group_layout",
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.VERTEX,
        buffer: { type: "read-only-storage" },
      },
    ],
  });

  const pipeline = device.createRenderPipeline({
    label: "splat_plate_pipeline",
    layout: device.createPipelineLayout({
      label: "splat_plate_pipeline_layout",
      bindGroupLayouts: [frameBindGroupLayout, bindGroupLayout],
    }),
    vertex: {
      module: shaderModule,
      entryPoint: "vs",
    },
    fragment: {
      module: shaderModule,
      entryPoint: "fs",
      targets: [
        {
          format: colorFormat,
          blend: {
            color: {
              srcFactor: "src-alpha",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
            alpha: {
              srcFactor: "one",
              dstFactor: "one-minus-src-alpha",
              operation: "add",
            },
          },
        },
      ],
    },
    primitive: {
      topology: "triangle-list",
      cullMode: "none",
    },
    depthStencil: {
      format: depthFormat,
      depthWriteEnabled: false,
      depthCompare: "less-equal",
    },
  });

  return {
    pipeline,
    bindGroupLayout,
    createBindGroup(buffers: SplatPlateBuffers): GPUBindGroup {
      return device.createBindGroup({
        label: "splat_plate_bind_group",
        layout: bindGroupLayout,
        entries: [
          { binding: 0, resource: { buffer: buffers.splatBuffer } },
          { binding: 1, resource: { buffer: buffers.sortedIndexBuffer } },
        ],
      });
    },
    draw(pass: GPURenderPassEncoder, bindGroup: GPUBindGroup, splatCount: number): void {
      const drawCall = getSplatPlateDrawCall(splatCount);
      if (!drawCall) {
        return;
      }
      pass.setPipeline(pipeline);
      pass.setBindGroup(1, bindGroup);
      pass.draw(drawCall.vertexCount, drawCall.instanceCount);
    },
  };
}
