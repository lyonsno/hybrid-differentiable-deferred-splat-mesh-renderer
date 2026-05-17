import gpuTileContributorArenaShader from "./shaders/gpu_tile_contributor_arena.wgsl?raw";
import {
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE,
  GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE,
  getGpuTileContributorArenaDispatchPlan,
  type GpuTileCoverageDispatch,
  type GpuTileCoveragePlan,
  type GpuTileContributorArenaProjectedContributor,
} from "./gpuTileCoverage.js";

export interface GpuTileContributorArenaLegacyProjection {
  readonly tileHeaders: Uint32Array;
  readonly tileRefs: Uint32Array;
  readonly tileCoverageWeights: Float32Array;
  readonly tileRefOrderingKeys: Uint32Array;
  readonly tileRefSourceOpacities: Float32Array;
  readonly tileRefShapeParams: Float32Array;
  readonly alphaParamData: Float32Array;
  readonly tileRefSplatIds: Uint32Array;
}

export interface GpuTileContributorArenaRuntimeBuffers {
  readonly projectedContributorU32Buffer: GPUBuffer;
  readonly projectedContributorF32Buffer: GPUBuffer;
  readonly projectedCountBuffer: GPUBuffer;
  readonly scatterCursorBuffer: GPUBuffer;
  readonly legacyTileHeaderBuffer: GPUBuffer;
  readonly legacyTileRefBuffer: GPUBuffer;
  readonly legacyTileCoverageWeightBuffer: GPUBuffer;
  readonly legacyAlphaParamBuffer: GPUBuffer;
}

export interface GpuTileContributorArenaRuntime {
  readonly bindGroup: GPUBindGroup;
  readonly buffers: GpuTileContributorArenaRuntimeBuffers;
  readonly legacyProjection: GpuTileContributorArenaLegacyProjection;
  readonly projectedContributorCount: number;
  dispatch(pass: GPUComputePassEncoder, plan: GpuTileCoveragePlan): void;
  destroy(): void;
}

export function createGpuTileContributorArenaRuntime(
  device: GPUDevice,
  plan: GpuTileCoveragePlan,
  contributors: readonly GpuTileContributorArenaProjectedContributor[],
): GpuTileContributorArenaRuntime {
  const orderedContributors = sortGpuArenaContributorsForLegacyStorage(contributors);
  const packed = packGpuArenaProjectedContributors(orderedContributors);
  const legacyProjection = projectGpuArenaToLegacyCompositorBuffers(plan, orderedContributors);
  const shaderModule = device.createShaderModule({
    label: "gpu_tile_contributor_arena_shader",
    code: gpuTileContributorArenaShader,
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: "gpu_tile_contributor_arena_bind_group_layout",
    entries: [
      storageEntry(0),
      storageEntry(1),
      storageEntry(2, "read-only-storage"),
      storageEntry(3, "read-only-storage"),
      storageEntry(4),
      storageEntry(5),
      storageEntry(6),
      storageEntry(7),
    ],
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "gpu_tile_contributor_arena_pipeline_layout",
    bindGroupLayouts: [bindGroupLayout],
  });
  const clearPipeline = createPipeline(device, shaderModule, pipelineLayout, "clear_contributor_arena");
  const countPipeline = createPipeline(device, shaderModule, pipelineLayout, "count_tile_contributors");
  const prefixPipeline = createPipeline(device, shaderModule, pipelineLayout, "prefix_tile_contributor_counts");
  const scatterPipeline = createPipeline(device, shaderModule, pipelineLayout, "scatter_tile_contributors");
  const buffers = createRuntimeBuffers(device, plan, packed, legacyProjection);
  const bindGroup = device.createBindGroup({
    label: "gpu_tile_contributor_arena_bind_group",
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: buffers.projectedCountBuffer } },
      { binding: 1, resource: { buffer: buffers.scatterCursorBuffer } },
      { binding: 2, resource: { buffer: buffers.projectedContributorU32Buffer } },
      { binding: 3, resource: { buffer: buffers.projectedContributorF32Buffer } },
      { binding: 4, resource: { buffer: buffers.legacyTileHeaderBuffer } },
      { binding: 5, resource: { buffer: buffers.legacyTileRefBuffer } },
      { binding: 6, resource: { buffer: buffers.legacyTileCoverageWeightBuffer } },
      { binding: 7, resource: { buffer: buffers.legacyAlphaParamBuffer } },
    ],
  });

  return {
    bindGroup,
    buffers,
    legacyProjection,
    projectedContributorCount: orderedContributors.length,
    dispatch(pass: GPUComputePassEncoder, dispatchPlan: GpuTileCoveragePlan): void {
      const stages = getGpuTileContributorArenaDispatchPlan({
        ...dispatchPlan,
        splatCount: orderedContributors.length,
      });
      dispatchStage(pass, clearPipeline, bindGroup, stages.clearArena);
      dispatchStage(pass, countPipeline, bindGroup, stages.countContributors);
      dispatchStage(pass, prefixPipeline, bindGroup, stages.prefixCounts);
      dispatchStage(pass, scatterPipeline, bindGroup, stages.scatterContributors);
    },
    destroy(): void {
      for (const buffer of Object.values(buffers)) {
        buffer.destroy();
      }
    },
  };
}

export function projectGpuArenaToLegacyCompositorBuffers(
  plan: Pick<GpuTileCoveragePlan, "tileCount" | "maxTileRefs">,
  contributors: readonly GpuTileContributorArenaProjectedContributor[],
): GpuTileContributorArenaLegacyProjection {
  const orderedContributors = [...contributors].sort(compareGpuArenaContributorStorageOrder);
  const tileHeaders = new Uint32Array(Math.max(0, plan.tileCount * 4));
  const tileRefs = new Uint32Array(Math.max(0, plan.maxTileRefs * 4));
  const tileCoverageWeights = new Float32Array(Math.max(0, plan.maxTileRefs));
  const tileRefOrderingKeys = new Uint32Array(Math.max(0, plan.maxTileRefs));
  tileRefOrderingKeys.fill(0xffffffff);
  const tileRefSourceOpacities = new Float32Array(Math.max(0, plan.maxTileRefs));
  tileRefSourceOpacities.fill(Number.NaN);
  const tileRefShapeParams = new Float32Array(Math.max(0, plan.maxTileRefs * 8));
  const alphaParamData = new Float32Array(Math.max(8, plan.maxTileRefs * 8));
  const tileRefSplatIds = new Uint32Array(Math.max(0, plan.maxTileRefs));

  const counts = new Uint32Array(Math.max(0, plan.tileCount));
  for (const contributor of orderedContributors) {
    if (contributor.tileIndex < counts.length) {
      counts[contributor.tileIndex] += 1;
    }
  }
  let offset = 0;
  for (let tileIndex = 0; tileIndex < counts.length; tileIndex += 1) {
    const count = counts[tileIndex];
    const headerBase = tileIndex * 4;
    tileHeaders[headerBase] = offset;
    tileHeaders[headerBase + 1] = count;
    tileHeaders[headerBase + 2] = count;
    tileHeaders[headerBase + 3] = 0;
    offset += count;
  }

  const cursors = new Uint32Array(Math.max(0, plan.tileCount));
  for (const contributor of orderedContributors) {
    if (contributor.tileIndex >= cursors.length) {
      continue;
    }
    const refIndex = tileHeaders[contributor.tileIndex * 4] + cursors[contributor.tileIndex];
    cursors[contributor.tileIndex] += 1;
    if (refIndex >= plan.maxTileRefs) {
      continue;
    }
    const refBase = refIndex * 4;
    tileRefs[refBase] = contributor.splatIndex;
    tileRefs[refBase + 1] = contributor.originalId;
    tileRefs[refBase + 2] = contributor.tileIndex;
    tileRefs[refBase + 3] = refIndex;
    tileCoverageWeights[refIndex] = contributor.coverageWeight;
    tileRefOrderingKeys[refIndex] = contributor.viewRank;
    tileRefSourceOpacities[refIndex] = contributor.opacity;
    tileRefSplatIds[refIndex] = contributor.splatIndex;

    const shapeBase = refIndex * 8;
    tileRefShapeParams[shapeBase] = contributor.centerPx[0];
    tileRefShapeParams[shapeBase + 1] = contributor.centerPx[1];
    tileRefShapeParams[shapeBase + 2] = contributor.inverseConic[0];
    tileRefShapeParams[shapeBase + 3] = contributor.inverseConic[1];
    tileRefShapeParams[shapeBase + 4] = contributor.inverseConic[2];

    const primaryBase = refIndex * 4;
    const conicBase = (plan.maxTileRefs + refIndex) * 4;
    alphaParamData[primaryBase] = contributor.opacity;
    alphaParamData[primaryBase + 1] = contributor.centerPx[0];
    alphaParamData[primaryBase + 2] = contributor.centerPx[1];
    alphaParamData[primaryBase + 3] = contributor.viewRank;
    alphaParamData[conicBase] = contributor.inverseConic[0];
    alphaParamData[conicBase + 1] = contributor.inverseConic[1];
    alphaParamData[conicBase + 2] = contributor.inverseConic[2];
  }

  return {
    tileHeaders,
    tileRefs,
    tileCoverageWeights,
    tileRefOrderingKeys,
    tileRefSourceOpacities,
    tileRefShapeParams,
    alphaParamData,
    tileRefSplatIds,
  };
}

export function sortGpuArenaContributorsForLegacyStorage(
  contributors: readonly GpuTileContributorArenaProjectedContributor[],
): GpuTileContributorArenaProjectedContributor[] {
  return [...contributors].sort(compareGpuArenaContributorStorageOrder);
}

function compareGpuArenaContributorStorageOrder(
  left: GpuTileContributorArenaProjectedContributor,
  right: GpuTileContributorArenaProjectedContributor,
): number {
  return (
    left.tileIndex - right.tileIndex ||
    left.viewRank - right.viewRank ||
    left.viewDepth - right.viewDepth ||
    left.splatIndex - right.splatIndex ||
    left.originalId - right.originalId
  );
}

export function packGpuArenaProjectedContributors(contributors: readonly GpuTileContributorArenaProjectedContributor[]): {
  readonly u32: Uint32Array;
  readonly f32: Float32Array;
} {
  const u32 = new Uint32Array(Math.max(1, contributors.length) * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE);
  const f32 = new Float32Array(Math.max(1, contributors.length) * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE);
  contributors.forEach((contributor, index) => {
    const u32Base = index * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_UINT32_STRIDE;
    const f32Base = index * GPU_TILE_CONTRIBUTOR_ARENA_RECORD_FLOAT32_STRIDE;
    u32[u32Base] = contributor.splatIndex;
    u32[u32Base + 1] = contributor.originalId;
    u32[u32Base + 2] = contributor.tileIndex;
    u32[u32Base + 3] = index;
    u32[u32Base + 4] = contributor.viewRank;
    f32[f32Base] = contributor.viewDepth;
    f32[f32Base + 1] = contributor.depthBand;
    f32[f32Base + 2] = contributor.coverageWeight;
    f32[f32Base + 3] = contributor.centerPx[0];
    f32[f32Base + 4] = contributor.centerPx[1];
    f32[f32Base + 5] = contributor.inverseConic[0];
    f32[f32Base + 6] = contributor.inverseConic[1];
    f32[f32Base + 7] = contributor.inverseConic[2];
    f32[f32Base + 8] = contributor.opacity;
    f32[f32Base + 9] = contributor.coverageAlpha;
    f32[f32Base + 10] = contributor.transmittanceBefore;
    f32[f32Base + 11] = contributor.retentionWeight;
    f32[f32Base + 12] = contributor.occlusionWeight;
  });
  return { u32, f32 };
}

function createRuntimeBuffers(
  device: GPUDevice,
  plan: GpuTileCoveragePlan,
  packed: { readonly u32: Uint32Array; readonly f32: Float32Array },
  legacyProjection: GpuTileContributorArenaLegacyProjection,
): GpuTileContributorArenaRuntimeBuffers {
  return {
    projectedContributorU32Buffer: storageBuffer(device, packed.u32, "gpu_arena_projected_contributor_u32"),
    projectedContributorF32Buffer: storageBuffer(device, packed.f32, "gpu_arena_projected_contributor_f32"),
    projectedCountBuffer: emptyStorageBuffer(device, Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT), "gpu_arena_projected_counts"),
    scatterCursorBuffer: emptyStorageBuffer(device, Math.max(16, plan.tileCount * Uint32Array.BYTES_PER_ELEMENT), "gpu_arena_scatter_cursors"),
    legacyTileHeaderBuffer: storageBuffer(device, legacyProjection.tileHeaders, "gpu_arena_legacy_tile_headers"),
    legacyTileRefBuffer: storageBuffer(device, legacyProjection.tileRefs, "gpu_arena_legacy_tile_refs"),
    legacyTileCoverageWeightBuffer: storageBuffer(device, legacyProjection.tileCoverageWeights, "gpu_arena_legacy_tile_coverage_weights"),
    legacyAlphaParamBuffer: storageBuffer(device, legacyProjection.alphaParamData, "gpu_arena_legacy_alpha_params"),
  };
}

function storageBuffer(device: GPUDevice, data: Uint32Array | Float32Array, label: string): GPUBuffer {
  const buffer = device.createBuffer({
    label,
    size: Math.max(16, data.byteLength),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint8Array(buffer.getMappedRange()).set(new Uint8Array(data.buffer, data.byteOffset, data.byteLength));
  buffer.unmap();
  return buffer;
}

function emptyStorageBuffer(device: GPUDevice, size: number, label: string): GPUBuffer {
  return device.createBuffer({
    label,
    size,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
}

function storageEntry(binding: number, type: GPUBufferBindingType = "storage"): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type },
  };
}

function createPipeline(
  device: GPUDevice,
  shaderModule: GPUShaderModule,
  layout: GPUPipelineLayout,
  entryPoint: string,
): GPUComputePipeline {
  return device.createComputePipeline({
    label: `gpu_tile_contributor_arena_${entryPoint}_pipeline`,
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
  dispatch: GpuTileCoverageDispatch,
): void {
  pass.setPipeline(pipeline);
  pass.setBindGroup(0, bindGroup);
  pass.dispatchWorkgroups(dispatch.x, dispatch.y, dispatch.z);
}
