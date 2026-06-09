import gpuAlphaDensityCompensationShader from "./shaders/gpu_alpha_density_compensation.wgsl?raw";

export const GPU_ALPHA_DENSITY_COMPENSATION_TILE_SIZE_PX = 48;
export const GPU_ALPHA_DENSITY_COMPENSATION_FIXED_POINT_SCALE = 1024;
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
