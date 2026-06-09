import gpuAlphaDensityCompensationShader from "./shaders/gpu_alpha_density_compensation.wgsl?raw";
import { createStorageBuffer } from "./buffers.js";

export const GPU_ALPHA_DENSITY_COMPENSATION_TILE_SIZE_PX = 48;
export const GPU_ALPHA_DENSITY_COMPENSATION_FIXED_POINT_SCALE = 1024;
export const GPU_ALPHA_DENSITY_COMPENSATION_ALPHA_MASS_CAP =
  GPU_ALPHA_DENSITY_COMPENSATION_TILE_SIZE_PX * GPU_ALPHA_DENSITY_COMPENSATION_TILE_SIZE_PX * 0.75;
export const GPU_ALPHA_DENSITY_COMPENSATION_FRAME_UNIFORM_BYTES = 96;
export const GPU_ALPHA_DENSITY_COMPENSATION_STAGE_ORDER = [
  "clear-tile-mass",
  "scatter-fixed-point-tile-mass",
  "write-compensated-opacity",
] as const;

export type GpuAlphaDensityCompensationStage =
  (typeof GPU_ALPHA_DENSITY_COMPENSATION_STAGE_ORDER)[number];

export interface GpuAlphaDensityCompensationSubstrateEvidence {
  readonly requestedBackend: "gpu-alpha-density-compensation";
  readonly effectiveBackend: "gpu-alpha-density-compensation-substrate";
  readonly opacityOutput: "gpu-compensated-opacity-buffer";
  readonly tileMassEncoding: "fixed-point-u32-atomic";
  readonly scatterAtomic: "atomicAdd-u32-fixed-point-alpha-mass";
  readonly coverageModel: "center-tile-substrate-first-pass";
  readonly stages: readonly GpuAlphaDensityCompensationStage[];
  readonly cpuReferencePreserved: true;
  readonly runtimeIntegrated: false;
  readonly falseClosureGuard: "gpu-alpha-density-substrate-does-not-imply-live-runtime-compensation";
}

export interface GpuAlphaDensityCompensationRuntimeEvidence {
  readonly requestedBackend: "gpu-alpha-density-compensation";
  readonly effectiveBackend: "gpu-alpha-density-compensation-runtime";
  readonly compensatedOpacitySource: "gpu-compensated-opacity-buffer";
  readonly cpuReferenceCompensationSource: "cpu-reference-opacity-buffer";
  readonly opacityInput: "raw-source-opacity-buffer";
  readonly opacityOutput: "gpu-compensated-opacity-buffer";
  readonly tileMassEncoding: "fixed-point-u32-atomic";
  readonly coverageModel: "center-tile-substrate-first-pass";
  readonly stages: readonly GpuAlphaDensityCompensationStage[];
  readonly runtimeIntegrated: true;
  readonly cpuReferencePreserved: true;
  readonly falseClosureGuard: "gpu-alpha-density-runtime-preserves-cpu-reference-witness";
}

export interface GpuAlphaDensityCompensationRuntime {
  readonly requestedBackend: "gpu-alpha-density-compensation";
  readonly effectiveBackend: "gpu-alpha-density-compensation-runtime";
  readonly bindGroup: GPUBindGroup;
  readonly frameUniformBuffer: GPUBuffer;
  readonly frameUniformData: Float32Array;
  readonly rawOpacityBuffer: GPUBuffer;
  readonly tileAlphaMassBuffer: GPUBuffer;
  readonly compensatedOpacityBuffer: GPUBuffer;
  readonly clearTileMassPipeline: GPUComputePipeline;
  readonly scatterTileMassPipeline: GPUComputePipeline;
  readonly writeCompensatedOpacityPipeline: GPUComputePipeline;
  readonly splatCount: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly tileCount: number;
  readonly tileSizePx: number;
  readonly fixedPointScale: number;
  readonly alphaMassCap: number;
  readonly evidence: GpuAlphaDensityCompensationRuntimeEvidence;
  destroy(): void;
}

export interface CreateGpuAlphaDensityCompensationRuntimeInput {
  readonly device: GPUDevice;
  readonly positionBuffer: GPUBuffer;
  readonly rawOpacities: Float32Array;
  readonly splatCount: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly tileSizePx?: number;
}

export interface DispatchGpuAlphaDensityCompensationFrameInput {
  readonly queue: GPUQueue;
  readonly pass: GPUComputePassEncoder;
  readonly viewProj: Float32Array | readonly number[];
  readonly viewportWidth: number;
  readonly viewportHeight: number;
}

export const GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE = gpuAlphaDensityCompensationShader;

export function createGpuAlphaDensityCompensationSubstrateEvidence(): GpuAlphaDensityCompensationSubstrateEvidence {
  return {
    requestedBackend: "gpu-alpha-density-compensation",
    effectiveBackend: "gpu-alpha-density-compensation-substrate",
    opacityOutput: "gpu-compensated-opacity-buffer",
    tileMassEncoding: "fixed-point-u32-atomic",
    scatterAtomic: "atomicAdd-u32-fixed-point-alpha-mass",
    coverageModel: "center-tile-substrate-first-pass",
    stages: GPU_ALPHA_DENSITY_COMPENSATION_STAGE_ORDER,
    cpuReferencePreserved: true,
    runtimeIntegrated: false,
    falseClosureGuard: "gpu-alpha-density-substrate-does-not-imply-live-runtime-compensation",
  };
}

export function createGpuAlphaDensityCompensationRuntimeEvidence(): GpuAlphaDensityCompensationRuntimeEvidence {
  return {
    requestedBackend: "gpu-alpha-density-compensation",
    effectiveBackend: "gpu-alpha-density-compensation-runtime",
    compensatedOpacitySource: "gpu-compensated-opacity-buffer",
    cpuReferenceCompensationSource: "cpu-reference-opacity-buffer",
    opacityInput: "raw-source-opacity-buffer",
    opacityOutput: "gpu-compensated-opacity-buffer",
    tileMassEncoding: "fixed-point-u32-atomic",
    coverageModel: "center-tile-substrate-first-pass",
    stages: GPU_ALPHA_DENSITY_COMPENSATION_STAGE_ORDER,
    runtimeIntegrated: true,
    cpuReferencePreserved: true,
    falseClosureGuard: "gpu-alpha-density-runtime-preserves-cpu-reference-witness",
  };
}

export function createGpuAlphaDensityCompensationRuntime(
  input: CreateGpuAlphaDensityCompensationRuntimeInput,
): GpuAlphaDensityCompensationRuntime {
  const tileColumns = Math.max(1, Math.floor(input.tileColumns));
  const tileRows = Math.max(1, Math.floor(input.tileRows));
  const splatCount = Math.max(0, Math.floor(input.splatCount));
  const tileCount = Math.max(1, tileColumns * tileRows);
  const tileSizePx = finitePositiveOrDefault(
    input.tileSizePx,
    GPU_ALPHA_DENSITY_COMPENSATION_TILE_SIZE_PX,
  );
  const rawOpacityBytes = new ArrayBuffer(input.rawOpacities.byteLength);
  new Float32Array(rawOpacityBytes).set(input.rawOpacities);
  const rawOpacityBuffer = createStorageBuffer(
    input.device,
    rawOpacityBytes,
    "gpu_alpha_density_raw_source_opacities",
  );
  const frameUniformBuffer = input.device.createBuffer({
    label: "gpu_alpha_density_compensation_frame_uniforms",
    size: GPU_ALPHA_DENSITY_COMPENSATION_FRAME_UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const tileAlphaMassBuffer = input.device.createBuffer({
    label: "gpu_alpha_density_tile_alpha_mass",
    size: Math.max(16, tileCount * Uint32Array.BYTES_PER_ELEMENT),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  const compensatedOpacityBuffer = input.device.createBuffer({
    label: "gpu_alpha_density_compensated_opacities",
    size: Math.max(16, splatCount * Float32Array.BYTES_PER_ELEMENT),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
  const shaderModule = input.device.createShaderModule({
    label: "gpu_alpha_density_compensation_shader",
    code: GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE,
  });
  const bindGroupLayout = input.device.createBindGroupLayout({
    label: "gpu_alpha_density_compensation_bind_group_layout",
    entries: [
      uniformEntry(0),
      storageEntry(1, "read-only-storage"),
      storageEntry(2, "read-only-storage"),
      storageEntry(3, "storage"),
      storageEntry(4, "storage"),
    ],
  });
  const pipelineLayout = input.device.createPipelineLayout({
    label: "gpu_alpha_density_compensation_pipeline_layout",
    bindGroupLayouts: [bindGroupLayout],
  });
  const bindGroup = input.device.createBindGroup({
    label: "gpu_alpha_density_compensation_bind_group",
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: frameUniformBuffer } },
      { binding: 1, resource: { buffer: input.positionBuffer } },
      { binding: 2, resource: { buffer: rawOpacityBuffer } },
      { binding: 3, resource: { buffer: tileAlphaMassBuffer } },
      { binding: 4, resource: { buffer: compensatedOpacityBuffer } },
    ],
  });

  const runtime: GpuAlphaDensityCompensationRuntime = {
    requestedBackend: "gpu-alpha-density-compensation",
    effectiveBackend: "gpu-alpha-density-compensation-runtime",
    bindGroup,
    frameUniformBuffer,
    frameUniformData: new Float32Array(GPU_ALPHA_DENSITY_COMPENSATION_FRAME_UNIFORM_BYTES / Float32Array.BYTES_PER_ELEMENT),
    rawOpacityBuffer,
    tileAlphaMassBuffer,
    compensatedOpacityBuffer,
    clearTileMassPipeline: createComputePipeline(
      input.device,
      shaderModule,
      pipelineLayout,
      "clear_alpha_density_tile_mass",
    ),
    scatterTileMassPipeline: createComputePipeline(
      input.device,
      shaderModule,
      pipelineLayout,
      "scatter_alpha_density_tile_mass",
    ),
    writeCompensatedOpacityPipeline: createComputePipeline(
      input.device,
      shaderModule,
      pipelineLayout,
      "write_compensated_opacity",
    ),
    splatCount,
    tileColumns,
    tileRows,
    tileCount,
    tileSizePx,
    fixedPointScale: GPU_ALPHA_DENSITY_COMPENSATION_FIXED_POINT_SCALE,
    alphaMassCap: GPU_ALPHA_DENSITY_COMPENSATION_ALPHA_MASS_CAP,
    evidence: createGpuAlphaDensityCompensationRuntimeEvidence(),
    destroy(): void {
      frameUniformBuffer.destroy();
      rawOpacityBuffer.destroy();
      tileAlphaMassBuffer.destroy();
      compensatedOpacityBuffer.destroy();
    },
  };
  return runtime;
}

export function dispatchGpuAlphaDensityCompensation(
  runtime: GpuAlphaDensityCompensationRuntime,
  input: DispatchGpuAlphaDensityCompensationFrameInput,
): void {
  writeGpuAlphaDensityCompensationFrameUniforms(runtime, input);
  input.queue.writeBuffer(runtime.frameUniformBuffer, 0, runtime.frameUniformData);
  dispatchStage(input.pass, runtime.clearTileMassPipeline, runtime.bindGroup, runtime.tileCount);
  dispatchStage(input.pass, runtime.scatterTileMassPipeline, runtime.bindGroup, runtime.splatCount);
  dispatchStage(input.pass, runtime.writeCompensatedOpacityPipeline, runtime.bindGroup, runtime.splatCount);
}

export function gpuAlphaDensityCompensationShaderContract(): {
  readonly shaderBytes: number;
  readonly hasFixedPointAtomicScatter: boolean;
  readonly hasThreeStageSubstrate: boolean;
} {
  return {
    shaderBytes: GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE.length,
    hasFixedPointAtomicScatter:
      /var<storage,\s*read_write>\s+tileAlphaMass:\s*array<atomic<u32>>/.test(GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE) &&
      /atomicAdd\(&tileAlphaMass\[/.test(GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE),
    hasThreeStageSubstrate:
      /fn\s+clear_alpha_density_tile_mass/.test(GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE) &&
      /fn\s+scatter_alpha_density_tile_mass/.test(GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE) &&
      /fn\s+write_compensated_opacity/.test(GPU_ALPHA_DENSITY_COMPENSATION_SHADER_SOURCE),
  };
}

function writeGpuAlphaDensityCompensationFrameUniforms(
  runtime: GpuAlphaDensityCompensationRuntime,
  input: DispatchGpuAlphaDensityCompensationFrameInput,
): void {
  if (input.viewProj.length < 16) {
    throw new Error("GPU alpha-density compensation view-projection matrix must contain at least 16 floats");
  }
  const data = new ArrayBuffer(GPU_ALPHA_DENSITY_COMPENSATION_FRAME_UNIFORM_BYTES);
  const f32 = new Float32Array(data);
  const u32 = new Uint32Array(data);
  f32.set(Array.prototype.slice.call(input.viewProj, 0, 16), 0);
  f32[16] = finitePositiveOrDefault(input.viewportWidth, 1);
  f32[17] = finitePositiveOrDefault(input.viewportHeight, 1);
  u32[18] = runtime.tileColumns;
  u32[19] = runtime.tileRows;
  u32[20] = runtime.splatCount;
  f32[21] = runtime.tileSizePx;
  f32[22] = runtime.alphaMassCap;
  f32[23] = runtime.fixedPointScale;
  runtime.frameUniformData.set(new Float32Array(data));
}

function createComputePipeline(
  device: GPUDevice,
  shaderModule: GPUShaderModule,
  layout: GPUPipelineLayout,
  entryPoint: string,
): GPUComputePipeline {
  return device.createComputePipeline({
    label: `gpu_alpha_density_compensation_${entryPoint}_pipeline`,
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
  count: number,
): void {
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(Math.ceil(Math.max(count, 1) / 64), 1, 1);
}

function storageEntry(binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type },
  };
}

function uniformEntry(binding: number): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type: "uniform" },
  };
}

function finitePositiveOrDefault(value: number | undefined, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : fallback;
}
