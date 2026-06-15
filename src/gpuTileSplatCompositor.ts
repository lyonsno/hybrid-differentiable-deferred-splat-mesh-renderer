import tileSplatCompositeShader from "./shaders/gpu_tile_splat_composite.wgsl?raw";
import tileSortShader from "./shaders/gpu_tile_sort.wgsl?raw";
import prefixSumShader from "./shaders/gpu_prefix_sum.wgsl?raw";

// Frame uniforms: viewProj(64) + viewport(8) + tileSizePx(4) + debugMode(4) +
//   tileGrid(8) + splatCount(4) + totalTileRefs(4) = 96
export const TILE_SPLAT_FRAME_UNIFORM_BYTES = 96;
const TILE_REF_U32_STRIDE = 8;
const TILE_REF_BYTES = TILE_REF_U32_STRIDE * 4;

export interface TileSplatCompositorPlan {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly tileCount: number;
  readonly splatCount: number;
  readonly maxTotalTileRefs: number;
}

export interface TileSplatCompositorResources {
  readonly plan: TileSplatCompositorPlan;
  readonly countPipeline: GPUComputePipeline;
  readonly scatterPipeline: GPUComputePipeline;
  readonly tileSortPipeline: GPUComputePipeline;
  readonly compositePipeline: GPUComputePipeline;
  readonly prefixScanPipeline: GPUComputePipeline;
  readonly prefixPropagatePipeline: GPUComputePipeline;
  readonly splatBindGroupLayout: GPUBindGroupLayout;
  readonly tileBindGroupLayout: GPUBindGroupLayout;
  readonly tileSortBindGroupLayout: GPUBindGroupLayout;
  readonly prefixBindGroupLayout: GPUBindGroupLayout;
  readonly tileCountBuffer: GPUBuffer;
  readonly tileOffsetBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileRefSortedBuffer: GPUBuffer;
  readonly frameUniformBuffer: GPUBuffer;
  readonly prefixBlockSumsBuffer: GPUBuffer;
  readonly tileSortParamsBuffer: GPUBuffer;
  readonly prefixParamsBuffer: GPUBuffer;
  destroy(): void;
}

export function planTileSplatCompositor(input: {
  viewportWidth: number;
  viewportHeight: number;
  tileSizePx: number;
  splatCount: number;
  averageRefsPerTile?: number;
}): TileSplatCompositorPlan {
  const { viewportWidth, viewportHeight, tileSizePx, splatCount } = input;
  const tileColumns = Math.ceil(viewportWidth / tileSizePx);
  const tileRows = Math.ceil(viewportHeight / tileSizePx);
  const tileCount = tileColumns * tileRows;
  const avgRefsPerTile = input.averageRefsPerTile ?? 256;
  const maxTotalTileRefs = Math.max(tileCount * avgRefsPerTile, splatCount * 8);
  return { viewportWidth, viewportHeight, tileSizePx, tileColumns, tileRows, tileCount, splatCount, maxTotalTileRefs };
}

export function createTileSplatCompositor(
  device: GPUDevice,
  plan: TileSplatCompositorPlan,
): TileSplatCompositorResources {
  const shaderModule = device.createShaderModule({
    label: "tile_splat_composite_shader",
    code: tileSplatCompositeShader,
  });

  const tileSortModule = device.createShaderModule({
    label: "tile_sort_shader",
    code: tileSortShader,
  });

  const prefixSumModule = device.createShaderModule({
    label: "tile_prefix_sum_shader",
    code: prefixSumShader,
  });

  // @group(0): splat data + frame uniforms (6 read-only-storage + 1 uniform)
  const splatBindGroupLayout = device.createBindGroupLayout({
    label: "tile_splat_splat_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
    ],
  });

  // @group(1): tile data (3 storage + 1 storage texture)
  const tileBindGroupLayout = device.createBindGroupLayout({
    label: "tile_splat_tile_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
    ],
  });

  // Tile sort: 1 uniform + 2 read-only + 1 read-only + 1 storage
  const tileSortBindGroupLayout = device.createBindGroupLayout({
    label: "tile_sort_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  // Prefix sum bind group (matches gpu_prefix_sum.wgsl)
  const prefixBindGroupLayout = device.createBindGroupLayout({
    label: "tile_prefix_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });

  // Pipeline layouts
  const twoGroupLayout = device.createPipelineLayout({
    label: "tile_splat_2group_pl",
    bindGroupLayouts: [splatBindGroupLayout, tileBindGroupLayout],
  });

  const tileSortLayout = device.createPipelineLayout({
    label: "tile_sort_pl",
    bindGroupLayouts: [tileSortBindGroupLayout],
  });

  const prefixLayout = device.createPipelineLayout({
    label: "tile_prefix_pl",
    bindGroupLayouts: [prefixBindGroupLayout],
  });

  // Pipelines
  const countPipeline = device.createComputePipeline({
    label: "tile_splat_count",
    layout: twoGroupLayout,
    compute: { module: shaderModule, entryPoint: "count_tile_refs" },
  });

  // Scatter no longer needs sort key bind group — just splat + tile groups
  const scatterPipeline = device.createComputePipeline({
    label: "tile_splat_scatter",
    layout: twoGroupLayout,
    compute: { module: shaderModule, entryPoint: "scatter_tile_refs" },
  });

  const tileSortPipeline = device.createComputePipeline({
    label: "tile_sort",
    layout: tileSortLayout,
    compute: { module: tileSortModule, entryPoint: "tile_sort" },
  });

  const compositePipeline = device.createComputePipeline({
    label: "tile_splat_composite",
    layout: twoGroupLayout,
    compute: { module: shaderModule, entryPoint: "composite" },
  });

  const prefixScanPipeline = device.createComputePipeline({
    label: "tile_prefix_scan",
    layout: prefixLayout,
    compute: { module: prefixSumModule, entryPoint: "scan" },
  });

  const prefixPropagatePipeline = device.createComputePipeline({
    label: "tile_prefix_propagate",
    layout: prefixLayout,
    compute: { module: prefixSumModule, entryPoint: "add_block_sums" },
  });

  // Buffers
  const frameUniformBuffer = device.createBuffer({
    label: "tile_splat_frame_uniforms",
    size: TILE_SPLAT_FRAME_UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const tileCountBuffer = device.createBuffer({
    label: "tile_splat_tile_counts",
    size: Math.max(16, plan.tileCount * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const tileOffsetBuffer = device.createBuffer({
    label: "tile_splat_tile_offsets",
    size: Math.max(16, plan.tileCount * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const refBufSize = Math.max(16, plan.maxTotalTileRefs * TILE_REF_BYTES);
  const tileRefBuffer = device.createBuffer({
    label: "tile_splat_tile_refs",
    size: refBufSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const tileRefSortedBuffer = device.createBuffer({
    label: "tile_splat_tile_refs_sorted",
    size: refBufSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const prefixBlockSumsBuffer = device.createBuffer({
    label: "tile_prefix_block_sums",
    size: Math.max(16, Math.ceil(plan.tileCount / 256) * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const prefixParamsBuffer = device.createBuffer({
    label: "tile_prefix_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(prefixParamsBuffer, 0,
    new Uint32Array([plan.tileCount, 0, 0, 0]));

  const tileSortParamsBuffer = device.createBuffer({
    label: "tile_sort_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(tileSortParamsBuffer, 0,
    new Uint32Array([plan.tileCount, plan.maxTotalTileRefs, TILE_REF_U32_STRIDE, 0]));

  return {
    plan,
    countPipeline, scatterPipeline, tileSortPipeline, compositePipeline,
    prefixScanPipeline, prefixPropagatePipeline,
    splatBindGroupLayout, tileBindGroupLayout, tileSortBindGroupLayout,
    prefixBindGroupLayout,
    tileCountBuffer, tileOffsetBuffer, tileRefBuffer, tileRefSortedBuffer,
    frameUniformBuffer, prefixBlockSumsBuffer, tileSortParamsBuffer, prefixParamsBuffer,
    destroy() {
      frameUniformBuffer.destroy();
      tileCountBuffer.destroy();
      tileOffsetBuffer.destroy();
      tileRefBuffer.destroy();
      tileRefSortedBuffer.destroy();
      prefixBlockSumsBuffer.destroy();
      prefixParamsBuffer.destroy();
      tileSortParamsBuffer.destroy();
    },
  };
}

export function writeTileSplatFrameUniforms(
  target: Float32Array,
  viewProj: Float32Array,
  plan: TileSplatCompositorPlan,
): void {
  target.set(viewProj, 0);
  target[16] = plan.viewportWidth;
  target[17] = plan.viewportHeight;
  target[18] = plan.tileSizePx;
  target[19] = 0; // debugMode
  const u32View = new Uint32Array(target.buffer, target.byteOffset, target.length);
  u32View[20] = plan.tileColumns;
  u32View[21] = plan.tileRows;
  u32View[22] = plan.splatCount;
  u32View[23] = plan.maxTotalTileRefs;
}

export interface TileSplatCompositorBindGroups {
  readonly splatBindGroup: GPUBindGroup;
  readonly tileBindGroup: GPUBindGroup;
  readonly tileSortBindGroup: GPUBindGroup;
  readonly sortedTileBindGroup: GPUBindGroup;
  readonly prefixBindGroup: GPUBindGroup;
}

export function createTileSplatBindGroups(
  device: GPUDevice,
  resources: TileSplatCompositorResources,
  splatBuffers: {
    positionBuffer: GPUBuffer;
    colorBuffer: GPUBuffer;
    scaleBuffer: GPUBuffer;
    rotationBuffer: GPUBuffer;
    opacityBuffer: GPUBuffer;
    sortedIndexBuffer: GPUBuffer;
  },
  outputTexture: GPUTexture,
): TileSplatCompositorBindGroups {
  const splatBindGroup = device.createBindGroup({
    label: "tile_splat_splat_bg",
    layout: resources.splatBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.frameUniformBuffer } },
      { binding: 1, resource: { buffer: splatBuffers.positionBuffer } },
      { binding: 2, resource: { buffer: splatBuffers.colorBuffer } },
      { binding: 3, resource: { buffer: splatBuffers.scaleBuffer } },
      { binding: 4, resource: { buffer: splatBuffers.rotationBuffer } },
      { binding: 5, resource: { buffer: splatBuffers.opacityBuffer } },
      { binding: 6, resource: { buffer: splatBuffers.sortedIndexBuffer } },
    ],
  });

  const tileBindGroup = device.createBindGroup({
    label: "tile_splat_tile_bg",
    layout: resources.tileBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileCountBuffer } },
      { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
      { binding: 2, resource: { buffer: resources.tileRefBuffer } },
      { binding: 3, resource: outputTexture.createView() },
    ],
  });

  // Tile sort bind group
  const tileSortBindGroup = device.createBindGroup({
    label: "tile_sort_bg",
    layout: resources.tileSortBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileSortParamsBuffer } },
      { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
      { binding: 2, resource: { buffer: resources.tileCountBuffer } },
      { binding: 3, resource: { buffer: resources.tileRefBuffer } },
      { binding: 4, resource: { buffer: resources.tileRefSortedBuffer } },
    ],
  });

  // For composite: same tile layout but binding 2 points to sorted refs
  const sortedTileBindGroup = device.createBindGroup({
    label: "tile_splat_sorted_tile_bg",
    layout: resources.tileBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileCountBuffer } },
      { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
      { binding: 2, resource: { buffer: resources.tileRefSortedBuffer } },
      { binding: 3, resource: outputTexture.createView() },
    ],
  });

  // Prefix sum bind group
  const prefixBindGroup = device.createBindGroup({
    label: "tile_prefix_bg",
    layout: resources.prefixBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileCountBuffer } },
      { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
      { binding: 2, resource: { buffer: resources.prefixBlockSumsBuffer } },
      { binding: 3, resource: { buffer: resources.prefixParamsBuffer } },
    ],
  });

  return { splatBindGroup, tileBindGroup, tileSortBindGroup, sortedTileBindGroup, prefixBindGroup };
}

/**
 * Encode just the composite pass, reusing previously sorted refs.
 * Use when the camera hasn't moved and the sorted ref buffer is still valid.
 */
export function encodeCompositeOnly(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  const { plan } = resources;
  const pass = encoder.beginComputePass({ label: "tile_composite" });
  pass.setPipeline(resources.compositePipeline);
  pass.setBindGroup(0, bindGroups.splatBindGroup);
  pass.setBindGroup(1, bindGroups.sortedTileBindGroup);
  pass.dispatchWorkgroups(
    Math.ceil(plan.viewportWidth / 8),
    Math.ceil(plan.viewportHeight / 8),
  );
  pass.end();
}

/**
 * Encode the full compute compositor pipeline:
 * count → GPU prefix sum → scatter → per-tile sort → composite
 *
 * All passes encoded into one command encoder — no CPU readback stalls.
 */
export function encodeFullComputeCompositorPipeline(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  const { plan } = resources;

  // Pass 1: Count tile refs per splat
  encoder.clearBuffer(resources.tileCountBuffer);
  {
    const pass = encoder.beginComputePass({ label: "tile_count" });
    pass.setPipeline(resources.countPipeline);
    pass.setBindGroup(0, bindGroups.splatBindGroup);
    pass.setBindGroup(1, bindGroups.tileBindGroup);
    pass.dispatchWorkgroups(Math.ceil(plan.splatCount / 256));
    pass.end();
  }

  // Pass 2: GPU prefix sum (tile counts → tile offsets)
  {
    const numWorkgroups = Math.ceil(plan.tileCount / 256);

    const scanPass = encoder.beginComputePass({ label: "prefix_scan" });
    scanPass.setPipeline(resources.prefixScanPipeline);
    scanPass.setBindGroup(0, bindGroups.prefixBindGroup);
    scanPass.dispatchWorkgroups(numWorkgroups);
    scanPass.end();

    if (numWorkgroups > 1) {
      const propagatePass = encoder.beginComputePass({ label: "prefix_propagate" });
      propagatePass.setPipeline(resources.prefixPropagatePipeline);
      propagatePass.setBindGroup(0, bindGroups.prefixBindGroup);
      propagatePass.dispatchWorkgroups(numWorkgroups);
      propagatePass.end();
    }
  }

  // Pass 3: Scatter tile refs (no sort keys — tile sort handles ordering)
  encoder.clearBuffer(resources.tileCountBuffer);
  {
    const pass = encoder.beginComputePass({ label: "tile_scatter" });
    pass.setPipeline(resources.scatterPipeline);
    pass.setBindGroup(0, bindGroups.splatBindGroup);
    pass.setBindGroup(1, bindGroups.tileBindGroup);
    pass.dispatchWorkgroups(Math.ceil(plan.splatCount / 256));
    pass.end();
  }

  // Pass 4: Per-tile streaming merge-sort (one workgroup per tile)
  {
    const pass = encoder.beginComputePass({ label: "tile_sort" });
    pass.setPipeline(resources.tileSortPipeline);
    pass.setBindGroup(0, bindGroups.tileSortBindGroup);
    pass.dispatchWorkgroups(plan.tileCount);
    pass.end();
  }

  // Pass 5: Composite (reads from sorted refs)
  {
    const pass = encoder.beginComputePass({ label: "tile_composite" });
    pass.setPipeline(resources.compositePipeline);
    pass.setBindGroup(0, bindGroups.splatBindGroup);
    pass.setBindGroup(1, bindGroups.sortedTileBindGroup);
    pass.dispatchWorkgroups(
      Math.ceil(plan.viewportWidth / 8),
      Math.ceil(plan.viewportHeight / 8),
    );
    pass.end();
  }
}
