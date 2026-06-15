import tileSplatCompositeShader from "./shaders/gpu_tile_splat_composite.wgsl?raw";
import projectSplatsShader from "./shaders/gpu_project_splats.wgsl?raw";
import tileDepthSortShader from "./shaders/gpu_tile_depth_sort.wgsl?raw";
import reorderRefsShader from "./shaders/gpu_reorder_refs.wgsl?raw";
import { createRadixSort, encodeRadixSortInit, encodeRadixSort, type RadixSortResources } from "./gpuRadixSort.js";
import prefixSumShader from "./shaders/gpu_prefix_sum.wgsl?raw";

// Frame uniforms: viewProj(64) + viewport(8) + tileSizePx(4) + debugMode(4) +
//   tileGrid(8) + splatCount(4) + totalTileRefs(4) = 96
export const TILE_SPLAT_FRAME_UNIFORM_BYTES = 96;
const TILE_ENTRY_BYTES = 4; // 1 u32 per tile entry (sortRank)

// Morton (Z-order) encoding for 2D coordinates — matches WGSL mortonEncode2D.
function mortonEncode2D(x: number, y: number): number {
  let mx = x & 0xFFFF;
  mx = (mx | (mx << 8)) & 0x00FF00FF;
  mx = (mx | (mx << 4)) & 0x0F0F0F0F;
  mx = (mx | (mx << 2)) & 0x33333333;
  mx = (mx | (mx << 1)) & 0x55555555;

  let my = y & 0xFFFF;
  my = (my | (my << 8)) & 0x00FF00FF;
  my = (my | (my << 4)) & 0x0F0F0F0F;
  my = (my | (my << 2)) & 0x33333333;
  my = (my | (my << 1)) & 0x55555555;

  return (mx | (my << 1)) >>> 0;
}

export interface TileSplatCompositorPlan {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx: number;
  readonly tileColumns: number;
  readonly tileRows: number;
  readonly tileCount: number;
  readonly mortonTileCount: number; // Morton-indexed array size (>= tileCount)
  readonly splatCount: number;
  readonly maxTotalTileRefs: number;
}

export interface TileSplatCompositorResources {
  readonly plan: TileSplatCompositorPlan;
  readonly projectPipeline: GPUComputePipeline;
  readonly countPipeline: GPUComputePipeline;
  readonly scatterPipeline: GPUComputePipeline;
  readonly reorderPipeline: GPUComputePipeline;
  readonly tileDepthSortPipeline: GPUComputePipeline;
  readonly compositePipeline: GPUComputePipeline;
  readonly prefixScanPipeline: GPUComputePipeline;
  readonly prefixScanBlockSumsPipeline: GPUComputePipeline;
  readonly prefixPropagatePipeline: GPUComputePipeline;
  readonly projectBindGroupLayout: GPUBindGroupLayout;
  readonly splatBindGroupLayout: GPUBindGroupLayout;
  readonly tileBindGroupLayout: GPUBindGroupLayout;
  readonly sortKeyBindGroupLayout: GPUBindGroupLayout;
  readonly reorderBindGroupLayout: GPUBindGroupLayout;
  readonly tileDepthSortBindGroupLayout: GPUBindGroupLayout;
  readonly prefixBindGroupLayout: GPUBindGroupLayout;
  readonly projCacheBuffer: GPUBuffer;
  readonly depthBuffer: GPUBuffer;
  readonly tileCountBuffer: GPUBuffer;
  readonly tileOffsetBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileRefSortedBuffer: GPUBuffer;
  readonly frameUniformBuffer: GPUBuffer;
  readonly prefixBlockSumsBuffer: GPUBuffer;
  readonly reorderParamsBuffer: GPUBuffer;
  readonly tileDepthSortParamsBuffer: GPUBuffer;
  readonly prefixParamsBuffer: GPUBuffer;
  readonly radixSort: RadixSortResources;
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
  // Morton-indexed arrays must span the full Morton range
  const mortonTileCount = mortonEncode2D(tileColumns - 1, tileRows - 1) + 1;
  const avgRefsPerTile = input.averageRefsPerTile ?? 256;
  const maxTotalTileRefs = Math.max(tileCount * avgRefsPerTile, splatCount * 8);
  return { viewportWidth, viewportHeight, tileSizePx, tileColumns, tileRows, tileCount, mortonTileCount, splatCount, maxTotalTileRefs };
}

export function createTileSplatCompositor(
  device: GPUDevice,
  plan: TileSplatCompositorPlan,
): TileSplatCompositorResources {
  const shaderModule = device.createShaderModule({
    label: "tile_splat_composite_shader",
    code: tileSplatCompositeShader,
  });

  const projectModule = device.createShaderModule({
    label: "project_splats_shader",
    code: projectSplatsShader,
  });

  const tileDepthSortModule = device.createShaderModule({
    label: "tile_depth_sort_shader",
    code: tileDepthSortShader,
  });

  const reorderModule = device.createShaderModule({
    label: "reorder_refs_shader",
    code: reorderRefsShader,
  });

  const prefixSumModule = device.createShaderModule({
    label: "tile_prefix_sum_shader",
    code: prefixSumShader,
  });

  // Project pass bind group: frame uniforms + raw splat data + projCache output
  const projectBindGroupLayout = device.createBindGroupLayout({
    label: "project_splats_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // positions
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // scales
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // rotations
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // opacities
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // sortedIndices
      { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },           // projCache (write)
      { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },           // depthBuffer (write)
    ],
  });

  // @group(0) for count/scatter/composite: frame uniforms + projCache + colors + sortedIndices
  const splatBindGroupLayout = device.createBindGroupLayout({
    label: "tile_splat_splat_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // projCache
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // colors
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // sortedIndices
    ],
  });

  // @group(1): tile data (3 storage + 1 storage texture + 1 read-only depth)
  const tileBindGroupLayout = device.createBindGroupLayout({
    label: "tile_splat_tile_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // depthBuffer
    ],
  });

  // @group(2) for scatter: just the radix sort key buffer (1 storage)
  // Total: 6 + 3 + 1 = 10 storage buffers — at the limit
  const sortKeyBindGroupLayout = device.createBindGroupLayout({
    label: "tile_splat_sort_key_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  // Reorder has its own layout (standalone, no splat data needed)
  const reorderBindGroupLayout = device.createBindGroupLayout({
    label: "reorder_refs_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
    ],
  });

  // Per-tile depth sort: 1 uniform + 2 read-only + 1 storage + 1 read-only depth
  const tileDepthSortBindGroupLayout = device.createBindGroupLayout({
    label: "tile_depth_sort_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // depthBuffer
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
  const projectLayout = device.createPipelineLayout({
    label: "project_splats_pl",
    bindGroupLayouts: [projectBindGroupLayout],
  });

  const twoGroupLayout = device.createPipelineLayout({
    label: "tile_splat_2group_pl",
    bindGroupLayouts: [splatBindGroupLayout, tileBindGroupLayout],
  });

  const threeGroupLayout = device.createPipelineLayout({
    label: "tile_splat_3group_pl",
    bindGroupLayouts: [splatBindGroupLayout, tileBindGroupLayout, sortKeyBindGroupLayout],
  });

  const reorderLayout = device.createPipelineLayout({
    label: "reorder_refs_pl",
    bindGroupLayouts: [reorderBindGroupLayout],
  });

  const tileDepthSortLayout = device.createPipelineLayout({
    label: "tile_depth_sort_pl",
    bindGroupLayouts: [tileDepthSortBindGroupLayout],
  });

  const prefixLayout = device.createPipelineLayout({
    label: "tile_prefix_pl",
    bindGroupLayouts: [prefixBindGroupLayout],
  });

  // Pipelines
  const projectPipeline = device.createComputePipeline({
    label: "project_splats",
    layout: projectLayout,
    compute: { module: projectModule, entryPoint: "project_splats" },
  });

  const countPipeline = device.createComputePipeline({
    label: "tile_splat_count",
    layout: twoGroupLayout,
    compute: { module: shaderModule, entryPoint: "count_tile_refs" },
  });

  const scatterPipeline = device.createComputePipeline({
    label: "tile_splat_scatter",
    layout: threeGroupLayout,
    compute: { module: shaderModule, entryPoint: "scatter_tile_refs" },
  });

  const reorderPipeline = device.createComputePipeline({
    label: "reorder_refs",
    layout: reorderLayout,
    compute: { module: reorderModule, entryPoint: "reorder_refs" },
  });

  const tileDepthSortPipeline = device.createComputePipeline({
    label: "tile_depth_sort",
    layout: tileDepthSortLayout,
    compute: { module: tileDepthSortModule, entryPoint: "tile_depth_sort" },
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

  const prefixScanBlockSumsPipeline = device.createComputePipeline({
    label: "tile_prefix_scan_block_sums",
    layout: prefixLayout,
    compute: { module: prefixSumModule, entryPoint: "scan_block_sums" },
  });

  const prefixPropagatePipeline = device.createComputePipeline({
    label: "tile_prefix_propagate",
    layout: prefixLayout,
    compute: { module: prefixSumModule, entryPoint: "add_block_sums" },
  });

  // Buffers
  const PROJ_CACHE_U32_STRIDE = 8;
  const projCacheBuffer = device.createBuffer({
    label: "proj_cache",
    size: Math.max(16, plan.splatCount * PROJ_CACHE_U32_STRIDE * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const frameUniformBuffer = device.createBuffer({
    label: "tile_splat_frame_uniforms",
    size: TILE_SPLAT_FRAME_UNIFORM_BYTES,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  const tileCountBuffer = device.createBuffer({
    label: "tile_splat_tile_counts",
    size: Math.max(16, plan.mortonTileCount * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const tileOffsetBuffer = device.createBuffer({
    label: "tile_splat_tile_offsets",
    size: Math.max(16, plan.mortonTileCount * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const entryBufSize = Math.max(16, plan.maxTotalTileRefs * TILE_ENTRY_BYTES);
  const tileRefBuffer = device.createBuffer({
    label: "tile_entries_unsorted",
    size: entryBufSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const tileRefSortedBuffer = device.createBuffer({
    label: "tile_entries_sorted",
    size: entryBufSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const depthBuffer = device.createBuffer({
    label: "depth_buffer",
    size: Math.max(16, plan.splatCount * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const prefixBlockSumsBuffer = device.createBuffer({
    label: "tile_prefix_block_sums",
    size: Math.max(16, Math.ceil(plan.mortonTileCount / 256) * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Prefix sum params — pre-written, static for this plan
  const prefixParamsBuffer = device.createBuffer({
    label: "tile_prefix_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(prefixParamsBuffer, 0,
    new Uint32Array([plan.mortonTileCount, 0, 0, 0]));

  // Tile depth sort params
  const tileDepthSortParamsBuffer = device.createBuffer({
    label: "tile_depth_sort_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(tileDepthSortParamsBuffer, 0,
    new Uint32Array([plan.mortonTileCount, 0, 0, 0]));

  // Reorder params — pre-written, static
  const reorderParamsBuffer = device.createBuffer({
    label: "reorder_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(reorderParamsBuffer, 0,
    new Uint32Array([plan.maxTotalTileRefs, 1, 0, 0])); // stride=1: 1 u32 per tile entry

  // Radix sort resources
  const radixSort = createRadixSort(device, plan.maxTotalTileRefs);

  return {
    plan,
    projectPipeline, countPipeline, scatterPipeline, reorderPipeline, tileDepthSortPipeline, compositePipeline,
    prefixScanPipeline, prefixScanBlockSumsPipeline, prefixPropagatePipeline,
    projectBindGroupLayout, splatBindGroupLayout, tileBindGroupLayout, sortKeyBindGroupLayout,
    reorderBindGroupLayout, tileDepthSortBindGroupLayout, prefixBindGroupLayout,
    projCacheBuffer, depthBuffer, tileCountBuffer, tileOffsetBuffer, tileRefBuffer, tileRefSortedBuffer,
    frameUniformBuffer, prefixBlockSumsBuffer, reorderParamsBuffer, tileDepthSortParamsBuffer, prefixParamsBuffer,
    radixSort,
    destroy() {
      projCacheBuffer.destroy();
      depthBuffer.destroy();
      frameUniformBuffer.destroy();
      tileCountBuffer.destroy();
      tileOffsetBuffer.destroy();
      tileRefBuffer.destroy();
      tileRefSortedBuffer.destroy();
      prefixBlockSumsBuffer.destroy();
      prefixParamsBuffer.destroy();
      reorderParamsBuffer.destroy();
      tileDepthSortParamsBuffer.destroy();
      radixSort.destroy();
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
  readonly projectBindGroup: GPUBindGroup;
  readonly splatBindGroup: GPUBindGroup;
  readonly tileBindGroup: GPUBindGroup;
  readonly sortKeyBindGroup: GPUBindGroup;
  readonly reorderBindGroup: GPUBindGroup;
  readonly tileDepthSortBindGroup: GPUBindGroup;
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
  // Project pass: reads raw splat data, writes projection cache
  const projectBindGroup = device.createBindGroup({
    label: "project_splats_bg",
    layout: resources.projectBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.frameUniformBuffer } },
      { binding: 1, resource: { buffer: splatBuffers.positionBuffer } },
      { binding: 2, resource: { buffer: splatBuffers.scaleBuffer } },
      { binding: 3, resource: { buffer: splatBuffers.rotationBuffer } },
      { binding: 4, resource: { buffer: splatBuffers.opacityBuffer } },
      { binding: 5, resource: { buffer: splatBuffers.sortedIndexBuffer } },
      { binding: 6, resource: { buffer: resources.projCacheBuffer } },
      { binding: 7, resource: { buffer: resources.depthBuffer } },
    ],
  });

  // Count/scatter/composite: reads from projection cache + colors
  const splatBindGroup = device.createBindGroup({
    label: "tile_splat_splat_bg",
    layout: resources.splatBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.frameUniformBuffer } },
      { binding: 1, resource: { buffer: resources.projCacheBuffer } },
      { binding: 2, resource: { buffer: splatBuffers.colorBuffer } },
      { binding: 3, resource: { buffer: splatBuffers.sortedIndexBuffer } },
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
      { binding: 4, resource: { buffer: resources.depthBuffer } },
    ],
  });

  // Scatter only writes radix sort keys
  const sortKeyBindGroup = device.createBindGroup({
    label: "tile_splat_sort_key_bg",
    layout: resources.sortKeyBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.radixSort.keyBuffers[0] } },
    ],
  });

  // Reorder: standalone bind group
  const reorderBindGroup = device.createBindGroup({
    label: "reorder_refs_bg",
    layout: resources.reorderBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.reorderParamsBuffer } },
      { binding: 1, resource: { buffer: resources.radixSort.valueBuffers[0] } },
      { binding: 2, resource: { buffer: resources.tileRefBuffer } },
      { binding: 3, resource: { buffer: resources.tileRefSortedBuffer } },
    ],
  });

  // Per-tile depth sort: sorts entries within each tile by full f32 depth
  const tileDepthSortBindGroup = device.createBindGroup({
    label: "tile_depth_sort_bg",
    layout: resources.tileDepthSortBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileDepthSortParamsBuffer } },
      { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
      { binding: 2, resource: { buffer: resources.tileCountBuffer } },
      { binding: 3, resource: { buffer: resources.tileRefSortedBuffer } },
      { binding: 4, resource: { buffer: resources.depthBuffer } },
    ],
  });

  // For composite: same tile layout but binding 2 points to sorted entries
  const sortedTileBindGroup = device.createBindGroup({
    label: "tile_splat_sorted_tile_bg",
    layout: resources.tileBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileCountBuffer } },
      { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
      { binding: 2, resource: { buffer: resources.tileRefSortedBuffer } },
      { binding: 3, resource: outputTexture.createView() },
      { binding: 4, resource: { buffer: resources.depthBuffer } },
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

  return { projectBindGroup, splatBindGroup, tileBindGroup, sortKeyBindGroup, reorderBindGroup, tileDepthSortBindGroup, sortedTileBindGroup, prefixBindGroup };
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
  // One workgroup per tile (8x8 threads, each owns 2x2 pixels = 16x16 tile)
  pass.dispatchWorkgroups(plan.tileColumns, plan.tileRows);
  pass.end();
}

/**
 * Encode the full compute compositor pipeline:
 * project → count → GPU prefix sum → init sort → scatter (with sort keys) → radix sort → reorder → composite
 *
 * All passes encoded into one command encoder — no CPU readback stalls.
 */
export function encodeFullComputeCompositorPipeline(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  const { plan } = resources;

  // Pass 0: Project all splats into projection cache
  {
    const pass = encoder.beginComputePass({ label: "project_splats" });
    pass.setPipeline(resources.projectPipeline);
    pass.setBindGroup(0, bindGroups.projectBindGroup);
    pass.dispatchWorkgroups(Math.ceil(plan.splatCount / 256));
    pass.end();
  }

  // Pass 1: Count tile refs per splat (reads from projection cache)
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
    const numWorkgroups = Math.ceil(plan.mortonTileCount / 256);

    const scanPass = encoder.beginComputePass({ label: "prefix_scan" });
    scanPass.setPipeline(resources.prefixScanPipeline);
    scanPass.setBindGroup(0, bindGroups.prefixBindGroup);
    scanPass.dispatchWorkgroups(numWorkgroups);
    scanPass.end();

    if (numWorkgroups > 1) {
      // Scan block sums (single workgroup — handles up to 256 blocks = 65536 tiles)
      const scanBlockPass = encoder.beginComputePass({ label: "prefix_scan_block_sums" });
      scanBlockPass.setPipeline(resources.prefixScanBlockSumsPipeline);
      scanBlockPass.setBindGroup(0, bindGroups.prefixBindGroup);
      scanBlockPass.dispatchWorkgroups(1);
      scanBlockPass.end();

      // Propagate scanned block prefixes to all elements
      const propagatePass = encoder.beginComputePass({ label: "prefix_propagate" });
      propagatePass.setPipeline(resources.prefixPropagatePipeline);
      propagatePass.setBindGroup(0, bindGroups.prefixBindGroup);
      propagatePass.dispatchWorkgroups(numWorkgroups);
      propagatePass.end();
    }
  }

  // Pass 2.5: Init radix sort keys (0xFFFFFFFF sentinel) and values (identity)
  encodeRadixSortInit(encoder, resources.radixSort);

  // Pass 3: Scatter tile refs + write radix sort keys
  encoder.clearBuffer(resources.tileCountBuffer);
  {
    const pass = encoder.beginComputePass({ label: "tile_scatter" });
    pass.setPipeline(resources.scatterPipeline);
    pass.setBindGroup(0, bindGroups.splatBindGroup);
    pass.setBindGroup(1, bindGroups.tileBindGroup);
    pass.setBindGroup(2, bindGroups.sortKeyBindGroup);
    pass.dispatchWorkgroups(Math.ceil(plan.splatCount / 256));
    pass.end();
  }

  // Pass 4: Global radix sort
  encodeRadixSort(encoder, resources.radixSort);

  // Pass 5: Reorder ref records by sorted permutation
  {
    const pass = encoder.beginComputePass({ label: "tile_reorder" });
    pass.setPipeline(resources.reorderPipeline);
    pass.setBindGroup(0, bindGroups.reorderBindGroup);
    pass.dispatchWorkgroups(Math.ceil(plan.maxTotalTileRefs / 256));
    pass.end();
  }

  // Pass 5.5: Per-tile depth sort (full f32 precision, one workgroup per tile)
  {
    const pass = encoder.beginComputePass({ label: "tile_depth_sort" });
    pass.setPipeline(resources.tileDepthSortPipeline);
    pass.setBindGroup(0, bindGroups.tileDepthSortBindGroup);
    pass.dispatchWorkgroups(plan.tileColumns, plan.tileRows);
    pass.end();
  }

  // Pass 6: Composite (shared-memory batched rasterizer, one workgroup per tile)
  {
    const pass = encoder.beginComputePass({ label: "tile_composite" });
    pass.setPipeline(resources.compositePipeline);
    pass.setBindGroup(0, bindGroups.splatBindGroup);
    pass.setBindGroup(1, bindGroups.sortedTileBindGroup);
    pass.dispatchWorkgroups(plan.tileColumns, plan.tileRows);
    pass.end();
  }
}
