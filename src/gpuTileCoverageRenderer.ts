import gpuTileCoverageShader from "./shaders/gpu_tile_coverage.wgsl?raw";
import {
  GPU_TILE_COVERAGE_BINDINGS,
  type GpuTileCoverageDispatchPlan,
  type GpuTileCoveragePlan,
  getGpuTileCoverageDispatchPlan,
} from "./gpuTileCoverage.js";

export interface GpuTileCoverageBuffers {
  readonly frameUniformBuffer: GPUBuffer;
  readonly positionBuffer: GPUBuffer;
  readonly colorBuffer: GPUBuffer;
  readonly projectedBoundsBuffer: GPUBuffer;
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileCoverageWeightBuffer: GPUBuffer;
  readonly orderingKeyBuffer: GPUBuffer;
  readonly alphaParamBuffer: GPUBuffer;
  readonly outputColorView: GPUTextureView;
}

export interface GpuTileCoveragePipelineSkeleton {
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly pipelineLayout: GPUPipelineLayout;
  readonly projectBoundsPipeline: GPUComputePipeline;
  readonly clearTilesPipeline: GPUComputePipeline;
  readonly buildTileRefsPipeline: GPUComputePipeline;
  readonly compositeTilesPipeline: GPUComputePipeline;
  createBindGroup(buffers: GpuTileCoverageBuffers): GPUBindGroup;
  dispatch(pass: GPUComputePassEncoder, bindGroup: GPUBindGroup, plan: GpuTileCoveragePlan): GpuTileCoverageDispatchPlan;
  dispatchComposite(pass: GPUComputePassEncoder, bindGroup: GPUBindGroup, plan: GpuTileCoveragePlan): void;
}

export function createGpuTileCoveragePipelineSkeleton(
  device: GPUDevice,
  outputFormat: GPUTextureFormat = "rgba16float",
): GpuTileCoveragePipelineSkeleton {
  const shaderModule = device.createShaderModule({
    label: "gpu_tile_coverage_shader",
    code: gpuTileCoverageShader,
  });

  const bindGroupLayout = device.createBindGroupLayout({
    label: "gpu_tile_coverage_bind_group_layout",
    entries: [
      {
        binding: GPU_TILE_COVERAGE_BINDINGS.frame,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.positions, "read-only-storage"),
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.colors, "read-only-storage"),
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.projectedBounds, "storage"),
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.tileHeaders, "storage"),
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.tileRefs, "storage"),
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.tileCoverageWeights, "storage"),
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.orderingKeys, "read-only-storage"),
      storageEntry(GPU_TILE_COVERAGE_BINDINGS.alphaParams, "read-only-storage"),
      {
        binding: GPU_TILE_COVERAGE_BINDINGS.outputColor,
        visibility: GPUShaderStage.COMPUTE,
        storageTexture: {
          access: "write-only",
          format: outputFormat,
        },
      },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    label: "gpu_tile_coverage_pipeline_layout",
    bindGroupLayouts: [bindGroupLayout],
  });
  const projectBoundsPipeline = createComputePipeline(device, shaderModule, pipelineLayout, "project_bounds");
  const clearTilesPipeline = createComputePipeline(device, shaderModule, pipelineLayout, "clear_tiles");
  const buildTileRefsPipeline = createComputePipeline(device, shaderModule, pipelineLayout, "build_tile_refs");
  const compositeTilesPipeline = createComputePipeline(device, shaderModule, pipelineLayout, "composite_tiles");

  return {
    bindGroupLayout,
    pipelineLayout,
    projectBoundsPipeline,
    clearTilesPipeline,
    buildTileRefsPipeline,
    compositeTilesPipeline,
    createBindGroup(buffers: GpuTileCoverageBuffers): GPUBindGroup {
      return device.createBindGroup({
        label: "gpu_tile_coverage_bind_group",
        layout: bindGroupLayout,
        entries: [
          { binding: GPU_TILE_COVERAGE_BINDINGS.frame, resource: { buffer: buffers.frameUniformBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.positions, resource: { buffer: buffers.positionBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.colors, resource: { buffer: buffers.colorBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.projectedBounds, resource: { buffer: buffers.projectedBoundsBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.tileHeaders, resource: { buffer: buffers.tileHeaderBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.tileRefs, resource: { buffer: buffers.tileRefBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.tileCoverageWeights, resource: { buffer: buffers.tileCoverageWeightBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.orderingKeys, resource: { buffer: buffers.orderingKeyBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.alphaParams, resource: { buffer: buffers.alphaParamBuffer } },
          { binding: GPU_TILE_COVERAGE_BINDINGS.outputColor, resource: buffers.outputColorView },
        ],
      });
    },
    dispatch(pass: GPUComputePassEncoder, bindGroup: GPUBindGroup, plan: GpuTileCoveragePlan): GpuTileCoverageDispatchPlan {
      const dispatchPlan = getGpuTileCoverageDispatchPlan(plan);
      dispatchStage(pass, projectBoundsPipeline, bindGroup, dispatchPlan.projectBounds);
      dispatchStage(pass, clearTilesPipeline, bindGroup, dispatchPlan.clearTiles);
      dispatchStage(pass, buildTileRefsPipeline, bindGroup, dispatchPlan.buildTileRefs);
      dispatchStage(pass, compositeTilesPipeline, bindGroup, dispatchPlan.compositeTiles);
      return dispatchPlan;
    },
    dispatchComposite(pass: GPUComputePassEncoder, bindGroup: GPUBindGroup, plan: GpuTileCoveragePlan): void {
      dispatchStage(pass, compositeTilesPipeline, bindGroup, {
        x: Math.ceil(plan.viewportWidth / 8),
        y: Math.ceil(plan.viewportHeight / 8),
        z: 1,
      });
    },
  };
}

function storageEntry(binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type },
  };
}

function createComputePipeline(
  device: GPUDevice,
  shaderModule: GPUShaderModule,
  layout: GPUPipelineLayout,
  entryPoint: string,
): GPUComputePipeline {
  return device.createComputePipeline({
    label: `gpu_tile_coverage_${entryPoint}_pipeline`,
    layout,
    compute: {
      module: shaderModule,
      entryPoint,
    },
  });
}

function dispatchStage(
  pass: GPUComputePassEncoder,
  pipeline: GPUComputePipeline,
  bindGroup: GPUBindGroup,
  dispatch: { readonly x: number; readonly y: number; readonly z: number },
): void {
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(dispatch.x, dispatch.y, dispatch.z);
}
