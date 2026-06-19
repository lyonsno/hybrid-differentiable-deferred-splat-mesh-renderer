import tileSplatCompositeShader from "./shaders/gpu_tile_splat_composite.wgsl?raw";
import tileSplatCompositeF16Shader from "./shaders/gpu_tile_splat_composite_f16.wgsl?raw";
import projectSplatsShader from "./shaders/gpu_project_splats.wgsl?raw";
import tileClassifyShader from "./shaders/gpu_tile_classify.wgsl?raw";
import tileDepthSortShader from "./shaders/gpu_tile_depth_sort.wgsl?raw";
import tileBucketSortShader from "./shaders/gpu_tile_bucket_sort.wgsl?raw";
import tileChunkSortShader from "./shaders/gpu_tile_chunk_sort.wgsl?raw";
import reorderRefsShader from "./shaders/gpu_reorder_refs.wgsl?raw";
import { createRadixSort, encodeRadixSortInit, encodeRadixSort, type RadixSortResources } from "./gpuRadixSort.js";
import prefixSumShader from "./shaders/gpu_prefix_sum.wgsl?raw";
import largeSplatScatterShader from "./shaders/gpu_large_splat_scatter.wgsl?raw";

// Frame uniforms: viewProj(64) + viewport(8) + tileSizePx(4) + debugMode(4) +
//   tileGrid(8) + splatCount(4) + totalTileRefs(4) = 96
export const TILE_SPLAT_FRAME_UNIFORM_BYTES = 96;
const PROJ_STRIDE_U32 = 9; // Must match PROJ_STRIDE in gpu_project_splats.wgsl
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
  readonly classifyPipeline: GPUComputePipeline;
  readonly tileDepthSortPipeline: GPUComputePipeline;
  readonly bucketSortPipeline: GPUComputePipeline;
  readonly chunkSortPipeline: GPUComputePipeline;
  readonly writeChunkIndirectPipeline: GPUComputePipeline;
  readonly compositePipeline: GPUComputePipeline;
  readonly prefixScanPipeline: GPUComputePipeline;
  readonly prefixScanBlockSumsPipeline: GPUComputePipeline;
  readonly prefixPropagatePipeline: GPUComputePipeline;
  readonly projectBindGroupLayout: GPUBindGroupLayout;
  readonly splatBindGroupLayout: GPUBindGroupLayout;
  readonly tileBindGroupLayout: GPUBindGroupLayout;
  readonly sortKeyBindGroupLayout: GPUBindGroupLayout;
  readonly reorderBindGroupLayout: GPUBindGroupLayout;
  readonly classifyBindGroupLayout: GPUBindGroupLayout;
  readonly tileDepthSortBindGroupLayout: GPUBindGroupLayout;
  readonly bucketSortBindGroupLayout: GPUBindGroupLayout;
  readonly chunkSortBindGroupLayout: GPUBindGroupLayout;
  readonly writeChunkIndirectBindGroupLayout: GPUBindGroupLayout;
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
  readonly classifyParamsBuffer: GPUBuffer;
  readonly bucketSortParamsBuffer: GPUBuffer;
  readonly chunkSortParamsBuffer: GPUBuffer;
  readonly smallTileListBuffer: GPUBuffer;
  readonly largeTileListBuffer: GPUBuffer;
  readonly tileListCountsBuffer: GPUBuffer;
  readonly largeTileOverflowBasesBuffer: GPUBuffer;
  readonly chunkRangesBuffer: GPUBuffer;
  readonly totalChunksBuffer: GPUBuffer;
  readonly indirectDispatchBuffer: GPUBuffer;
  readonly prefixParamsBuffer: GPUBuffer;
  readonly largeSplatScatterPipeline: GPUComputePipeline;
  readonly largeSplatScatterBindGroupLayout: GPUBindGroupLayout;
  readonly largeSplatListBuffer: GPUBuffer;
  readonly largeSplatCountBuffer: GPUBuffer;
  readonly largeSplatIndirectBuffer: GPUBuffer;
  readonly radixSort: RadixSortResources;
  destroy(): void;
}

export function planTileSplatCompositor(input: {
  viewportWidth: number;
  viewportHeight: number;
  tileSizePx: number;
  splatCount: number;
  averageRefsPerTile?: number;
  tileEntryMultiplier?: number;
}): TileSplatCompositorPlan {
  const { viewportWidth, viewportHeight, tileSizePx, splatCount } = input;
  const tileColumns = Math.ceil(viewportWidth / tileSizePx);
  const tileRows = Math.ceil(viewportHeight / tileSizePx);
  const tileCount = tileColumns * tileRows;
  // Morton-indexed arrays must span the full Morton range
  const mortonTileCount = mortonEncode2D(tileColumns - 1, tileRows - 1) + 1;
  // Tile ref budget. Sized by a per-splat multiplier that grows dynamically
  // via async GPU readback (see PlayCanvas's approach). Start modest and let
  // the readback feedback loop grow the budget if needed. The first frame may
  // overflow silently — the readback catches it and resizes for frame 2.
  // Hard cap: reorder/radix-init dispatch ceil(N/256) workgroups, WebGPU max
  // is 65535 per dimension → max 65535*256 = 16,776,960 refs.
  const MAX_DISPATCH_SAFE_REFS = 65535 * 256;
  // With the 8-tile-radius cap in the projection shader, each splat touches
  // at most ~256 tiles. A multiplier of 16 handles views where most splats
  // are close up. Capped by WebGPU dispatch limits.
  const tileEntryMultiplier = input.tileEntryMultiplier ?? 16;
  const maxTotalTileRefs = Math.min(
    Math.ceil(splatCount * tileEntryMultiplier),
    MAX_DISPATCH_SAFE_REFS,
  );
  return { viewportWidth, viewportHeight, tileSizePx, tileColumns, tileRows, tileCount, mortonTileCount, splatCount, maxTotalTileRefs };
}

export function createTileSplatCompositor(
  device: GPUDevice,
  plan: TileSplatCompositorPlan,
  options?: { f16?: boolean },
): TileSplatCompositorResources {
  const useF16 = options?.f16 ?? false;

  const shaderModule = device.createShaderModule({
    label: "tile_splat_composite_shader",
    code: tileSplatCompositeShader,
  });

  const projectModule = device.createShaderModule({
    label: "project_splats_shader",
    code: projectSplatsShader,
  });

  const classifyModule = device.createShaderModule({
    label: "tile_classify_shader",
    code: tileClassifyShader,
  });

  const tileDepthSortModule = device.createShaderModule({
    label: "tile_depth_sort_shader",
    code: tileDepthSortShader,
  });

  const bucketSortModule = device.createShaderModule({
    label: "tile_bucket_sort_shader",
    code: tileBucketSortShader,
  });

  const chunkSortModule = device.createShaderModule({
    label: "tile_chunk_sort_shader",
    code: tileChunkSortShader,
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
      { binding: 8, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // roughness
      { binding: 9, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // metalness
      { binding: 10, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // normals
      { binding: 11, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },           // largeSplatList
      { binding: 12, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },           // largeSplatCount
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

  // @group(1): tile data (3 storage + 3 storage textures + 1 read-only depth)
  const tileBindGroupLayout = device.createBindGroupLayout({
    label: "tile_splat_tile_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // depthBuffer
      { binding: 5, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32float" } }, // G-buffer depth
      { binding: 6, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32uint" } }, // G-buffer normal (oct, pack2x16float)
      { binding: 7, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "r32uint" } }, // G-buffer material (pack2x16float roughness, metalness)
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

  // Small tile depth sort: matches gpu_tile_depth_sort.wgsl bindings
  const tileDepthSortBindGroupLayout = device.createBindGroupLayout({
    label: "tile_depth_sort_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },            // tileEntries (rw)
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },  // tileCounts
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },  // depthBuffer
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },  // smallTileList
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },  // tileListCounts
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },  // tileOffsets
    ],
  });

  // Classify: 1 uniform + tileCounts + 2 lists + atomic counts + overflow bases
  const classifyBindGroupLayout = device.createBindGroupLayout({
    label: "classify_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // tileCounts
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // smallTileList
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // largeTileList
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // tileListCounts
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // largeTileOverflowBases
      { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // indirectDispatchArgs
    ],
  });

  // Bucket sort: 1 uniform + entries + overflow + counts + depth + list + chunks + totalChunks + listCounts + offsets
  const bucketSortBindGroupLayout = device.createBindGroupLayout({
    label: "bucket_sort_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // tileEntries
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // overflowBases
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // tileCounts
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // depthBuffer
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // largeTileList
      { binding: 6, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // chunkRanges
      { binding: 7, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // totalChunks
      { binding: 8, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // tileListCounts
      { binding: 9, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // tileOffsets
    ],
  });

  // Chunk sort: 1 uniform + entries + depth + chunkRanges + totalChunks
  const chunkSortBindGroupLayout = device.createBindGroupLayout({
    label: "chunk_sort_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // tileEntries
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // depthBuffer
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // chunkRanges
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // totalChunks
    ],
  });

  // Write chunk indirect: just the indirect dispatch buffer
  const writeChunkIndirectBindGroupLayout = device.createBindGroupLayout({
    label: "write_chunk_indirect_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } }, // indirectDispatchArgs
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

  const classifyLayout = device.createPipelineLayout({
    label: "classify_pl",
    bindGroupLayouts: [classifyBindGroupLayout],
  });

  const tileDepthSortLayout = device.createPipelineLayout({
    label: "tile_depth_sort_pl",
    bindGroupLayouts: [tileDepthSortBindGroupLayout],
  });

  const bucketSortLayout = device.createPipelineLayout({
    label: "bucket_sort_pl",
    bindGroupLayouts: [bucketSortBindGroupLayout],
  });

  const chunkSortLayout = device.createPipelineLayout({
    label: "chunk_sort_pl",
    bindGroupLayouts: [chunkSortBindGroupLayout],
  });

  const writeChunkIndirectLayout = device.createPipelineLayout({
    label: "write_chunk_indirect_pl",
    bindGroupLayouts: [chunkSortBindGroupLayout, writeChunkIndirectBindGroupLayout],
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

  const classifyPipeline = device.createComputePipeline({
    label: "classify_tiles",
    layout: classifyLayout,
    compute: { module: classifyModule, entryPoint: "classify_tiles" },
  });

  const tileDepthSortPipeline = device.createComputePipeline({
    label: "tile_depth_sort",
    layout: tileDepthSortLayout,
    compute: { module: tileDepthSortModule, entryPoint: "tile_depth_sort" },
  });

  const bucketSortPipeline = device.createComputePipeline({
    label: "bucket_sort",
    layout: bucketSortLayout,
    compute: { module: bucketSortModule, entryPoint: "bucket_sort" },
  });

  const chunkSortPipeline = device.createComputePipeline({
    label: "chunk_sort",
    layout: chunkSortLayout,
    compute: { module: chunkSortModule, entryPoint: "chunk_sort" },
  });

  const writeChunkIndirectPipeline = device.createComputePipeline({
    label: "write_chunk_indirect",
    layout: writeChunkIndirectLayout,
    compute: { module: chunkSortModule, entryPoint: "write_chunk_indirect" },
  });

  const compositeModule = useF16
    ? device.createShaderModule({
        label: "tile_splat_composite_f16_shader",
        code: tileSplatCompositeF16Shader,
      })
    : shaderModule;

  const compositePipeline = device.createComputePipeline({
    label: useF16 ? "tile_splat_composite_f16" : "tile_splat_composite",
    layout: twoGroupLayout,
    compute: { module: compositeModule, entryPoint: "composite" },
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

  // Large splat scatter: @group(0) = frame+projCache (reuse splatBindGroupLayout sans colors/sortedIndices)
  // Uses its own layout: group(0) = frame+projCache, group(1) = tileCounts+offsets+entries, group(2) = largeSplatList+count
  const largeSplatScatterBindGroupLayout = device.createBindGroupLayout({
    label: "large_splat_scatter_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // largeSplatList
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } }, // largeSplatCount
    ],
  });

  const largeSplatScatterModule = device.createShaderModule({
    label: "large_splat_scatter_shader",
    code: largeSplatScatterShader,
  });

  // Large scatter uses: group(0) = splatBindGroupLayout (frame+projCache), group(1) = tileBindGroupLayout, group(2) = largeSplatScatter
  // But splatBindGroupLayout has 4 bindings (frame, projCache, colors, sortedIndices) while the large scatter
  // only needs frame + projCache. We reuse the same layout — extra bindings are ignored by the shader.
  const largeSplatScatterLayout = device.createPipelineLayout({
    label: "large_splat_scatter_pl",
    bindGroupLayouts: [splatBindGroupLayout, tileBindGroupLayout, largeSplatScatterBindGroupLayout],
  });

  const largeSplatScatterPipeline = device.createComputePipeline({
    label: "large_splat_scatter",
    layout: largeSplatScatterLayout,
    compute: { module: largeSplatScatterModule, entryPoint: "main" },
  });

  // Buffers
  const projCacheBuffer = device.createBuffer({
    label: "proj_cache",
    size: Math.max(16, plan.splatCount * PROJ_STRIDE_U32 * 4),
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
  // 2× capacity: first half = tile entries, second half = overflow scratch for bucket sort
  const entryBufSize = Math.max(16, plan.maxTotalTileRefs * TILE_ENTRY_BYTES * 2);
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
    new Uint32Array([plan.mortonTileCount, plan.maxTotalTileRefs, 0, 0]));

  // Classify params
  const classifyParamsBuffer = device.createBuffer({
    label: "classify_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(classifyParamsBuffer, 0,
    new Uint32Array([plan.tileColumns, plan.tileRows, plan.mortonTileCount, plan.maxTotalTileRefs]));

  // Tile lists and coordination buffers
  const maxTiles = plan.tileCount;
  const smallTileListBuffer = device.createBuffer({
    label: "small_tile_list",
    size: Math.max(16, maxTiles * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const largeTileListBuffer = device.createBuffer({
    label: "large_tile_list",
    size: Math.max(16, maxTiles * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const tileListCountsBuffer = device.createBuffer({
    label: "tile_list_counts",
    size: 16, // [0]=small, [1]=large, [2]=overflow entries
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const largeTileOverflowBasesBuffer = device.createBuffer({
    label: "large_tile_overflow_bases",
    size: Math.max(16, maxTiles * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Chunk coordination
  const MAX_CHUNKS = 1024;
  const chunkRangesBuffer = device.createBuffer({
    label: "chunk_ranges",
    size: Math.max(16, MAX_CHUNKS * 8), // 2 u32 per chunk (start, count)
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  const totalChunksBuffer = device.createBuffer({
    label: "total_chunks",
    size: 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Indirect dispatch args: 3 u32 per dispatch × 3 dispatches (small sort + bucket sort + chunk sort)
  const indirectDispatchBuffer = device.createBuffer({
    label: "indirect_dispatch_args",
    size: 9 * 4, // 3 × (x, y, z)
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST,
  });

  // Large splat list (worst case: all splats are large)
  const largeSplatListBuffer = device.createBuffer({
    label: "large_splat_list",
    size: Math.max(16, plan.splatCount * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });
  // Atomic counter for large splats
  const largeSplatCountBuffer = device.createBuffer({
    label: "large_splat_count",
    size: 16,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  // Indirect dispatch args for large splat scatter (x=largeSplatCount, y=1, z=1)
  const largeSplatIndirectBuffer = device.createBuffer({
    label: "large_splat_indirect",
    size: 12,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.INDIRECT | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  // Pre-write y=1, z=1 — x gets copied from largeSplatCount each frame
  device.queue.writeBuffer(largeSplatIndirectBuffer, 0, new Uint32Array([0, 1, 1]));

  // Bucket sort params
  const bucketSortParamsBuffer = device.createBuffer({
    label: "bucket_sort_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(bucketSortParamsBuffer, 0,
    new Uint32Array([plan.maxTotalTileRefs * 2, MAX_CHUNKS, 0, 0])); // bufferCapacity = 2× for overflow

  // Chunk sort params
  const chunkSortParamsBuffer = device.createBuffer({
    label: "chunk_sort_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(chunkSortParamsBuffer, 0,
    new Uint32Array([MAX_CHUNKS, 0, 0, 0]));

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
    projectPipeline, countPipeline, scatterPipeline, reorderPipeline,
    classifyPipeline, tileDepthSortPipeline, bucketSortPipeline, chunkSortPipeline, writeChunkIndirectPipeline, compositePipeline,
    prefixScanPipeline, prefixScanBlockSumsPipeline, prefixPropagatePipeline,
    projectBindGroupLayout, splatBindGroupLayout, tileBindGroupLayout, sortKeyBindGroupLayout,
    reorderBindGroupLayout, classifyBindGroupLayout, tileDepthSortBindGroupLayout,
    bucketSortBindGroupLayout, chunkSortBindGroupLayout, writeChunkIndirectBindGroupLayout, prefixBindGroupLayout,
    projCacheBuffer, depthBuffer, tileCountBuffer, tileOffsetBuffer, tileRefBuffer, tileRefSortedBuffer,
    frameUniformBuffer, prefixBlockSumsBuffer, reorderParamsBuffer, tileDepthSortParamsBuffer,
    classifyParamsBuffer, bucketSortParamsBuffer, chunkSortParamsBuffer,
    smallTileListBuffer, largeTileListBuffer, tileListCountsBuffer,
    largeTileOverflowBasesBuffer, chunkRangesBuffer, totalChunksBuffer, indirectDispatchBuffer,
    prefixParamsBuffer,
    largeSplatScatterPipeline, largeSplatScatterBindGroupLayout,
    largeSplatListBuffer, largeSplatCountBuffer, largeSplatIndirectBuffer,
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
      classifyParamsBuffer.destroy();
      bucketSortParamsBuffer.destroy();
      chunkSortParamsBuffer.destroy();
      smallTileListBuffer.destroy();
      largeTileListBuffer.destroy();
      tileListCountsBuffer.destroy();
      largeTileOverflowBasesBuffer.destroy();
      chunkRangesBuffer.destroy();
      totalChunksBuffer.destroy();
      indirectDispatchBuffer.destroy();
      largeSplatListBuffer.destroy();
      largeSplatCountBuffer.destroy();
      largeSplatIndirectBuffer.destroy();
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
  readonly classifyBindGroup: GPUBindGroup;
  readonly tileDepthSortBindGroup: GPUBindGroup;
  readonly bucketSortBindGroup: GPUBindGroup;
  readonly chunkSortBindGroup: GPUBindGroup;
  readonly writeChunkIndirectBindGroup: GPUBindGroup;
  readonly sortedTileBindGroup: GPUBindGroup;
  readonly prefixBindGroup: GPUBindGroup;
  readonly largeSplatScatterBindGroup: GPUBindGroup;
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
    normalBuffer?: GPUBuffer;
    roughnessBuffer?: GPUBuffer;
    metalnessBuffer?: GPUBuffer;
    sortedIndexBuffer: GPUBuffer;
  },
  outputTexture: GPUTexture,
  gbufferTextures: { depth: GPUTexture; normal: GPUTexture; material: GPUTexture },
): TileSplatCompositorBindGroups {
  // Default material buffer (all 0.75 roughness / 0.0 metalness) for when no material data exists
  const defaultMaterialBuffer = (label: string, defaultValue: number) => {
    const buf = device.createBuffer({
      label,
      size: Math.max(16, resources.plan.splatCount * 4),
      usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    });
    const data = new Float32Array(resources.plan.splatCount);
    data.fill(defaultValue);
    device.queue.writeBuffer(buf, 0, data);
    return buf;
  };
  const roughnessBuffer = splatBuffers.roughnessBuffer ?? defaultMaterialBuffer("default_roughness", 0.75);
  const metalnessBuffer = splatBuffers.metalnessBuffer ?? defaultMaterialBuffer("default_metalness", 0.0);
  // Empty normal buffer signals the shader to use covariance-derived normals.
  // 16 bytes = 4 floats → arrayLength(&normalData) = 4, so only splatId=0 passes
  // the bounds check (normalBase+2 = 2 < 4), reads zeros, and falls back via the
  // bakedLen > 0.001 guard. All other splats skip the baked-normal path entirely.
  const normalBuffer = splatBuffers.normalBuffer ?? device.createBuffer({
    label: "default_empty_normals",
    size: 16,
    usage: GPUBufferUsage.STORAGE,
  });

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
      { binding: 8, resource: { buffer: roughnessBuffer } },
      { binding: 9, resource: { buffer: metalnessBuffer } },
      { binding: 10, resource: { buffer: normalBuffer } },
      { binding: 11, resource: { buffer: resources.largeSplatListBuffer } },
      { binding: 12, resource: { buffer: resources.largeSplatCountBuffer } },
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
      { binding: 5, resource: gbufferTextures.depth.createView() },
      { binding: 6, resource: gbufferTextures.normal.createView() },
      { binding: 7, resource: gbufferTextures.material.createView() },
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

  // Classify tiles into small/large lists
  const classifyBindGroup = device.createBindGroup({
    label: "classify_bg",
    layout: resources.classifyBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.classifyParamsBuffer } },
      { binding: 1, resource: { buffer: resources.tileCountBuffer } },
      { binding: 2, resource: { buffer: resources.smallTileListBuffer } },
      { binding: 3, resource: { buffer: resources.largeTileListBuffer } },
      { binding: 4, resource: { buffer: resources.tileListCountsBuffer } },
      { binding: 5, resource: { buffer: resources.largeTileOverflowBasesBuffer } },
      { binding: 6, resource: { buffer: resources.indirectDispatchBuffer } },
    ],
  });

  // Small tile depth sort (dispatched from smallTileList)
  // Reads directly from tileRefBuffer — radix sort/reorder eliminated since
  // scatter already places refs at correct prefix-summed tile offsets.
  const tileDepthSortBindGroup = device.createBindGroup({
    label: "tile_depth_sort_bg",
    layout: resources.tileDepthSortBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileRefBuffer } }, // tileEntries
      { binding: 1, resource: { buffer: resources.tileCountBuffer } },
      { binding: 2, resource: { buffer: resources.depthBuffer } },
      { binding: 3, resource: { buffer: resources.smallTileListBuffer } },
      { binding: 4, resource: { buffer: resources.tileListCountsBuffer } },
      { binding: 5, resource: { buffer: resources.tileOffsetBuffer } },
    ],
  });

  // Bucket sort for large tiles
  const bucketSortBindGroup = device.createBindGroup({
    label: "bucket_sort_bg",
    layout: resources.bucketSortBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.bucketSortParamsBuffer } },
      { binding: 1, resource: { buffer: resources.tileRefBuffer } }, // tileEntries
      { binding: 2, resource: { buffer: resources.largeTileOverflowBasesBuffer } },
      { binding: 3, resource: { buffer: resources.tileCountBuffer } },
      { binding: 4, resource: { buffer: resources.depthBuffer } },
      { binding: 5, resource: { buffer: resources.largeTileListBuffer } },
      { binding: 6, resource: { buffer: resources.chunkRangesBuffer } },
      { binding: 7, resource: { buffer: resources.totalChunksBuffer } },
      { binding: 8, resource: { buffer: resources.tileListCountsBuffer } },
      { binding: 9, resource: { buffer: resources.tileOffsetBuffer } },
    ],
  });

  // Chunk sort for bucket-sorted chunks
  const chunkSortBindGroup = device.createBindGroup({
    label: "chunk_sort_bg",
    layout: resources.chunkSortBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.chunkSortParamsBuffer } },
      { binding: 1, resource: { buffer: resources.tileRefBuffer } }, // tileEntries
      { binding: 2, resource: { buffer: resources.depthBuffer } },
      { binding: 3, resource: { buffer: resources.chunkRangesBuffer } },
      { binding: 4, resource: { buffer: resources.totalChunksBuffer } },
    ],
  });

  // Write chunk indirect: copies totalChunks → indirect dispatch args
  const writeChunkIndirectBindGroup = device.createBindGroup({
    label: "write_chunk_indirect_bg",
    layout: resources.writeChunkIndirectBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.indirectDispatchBuffer } },
    ],
  });

  // For composite + per-tile sort: reads directly from scatter output
  const sortedTileBindGroup = device.createBindGroup({
    label: "tile_splat_sorted_tile_bg",
    layout: resources.tileBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.tileCountBuffer } },
      { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
      { binding: 2, resource: { buffer: resources.tileRefBuffer } },
      { binding: 3, resource: outputTexture.createView() },
      { binding: 4, resource: { buffer: resources.depthBuffer } },
      { binding: 5, resource: gbufferTextures.depth.createView() },
      { binding: 6, resource: gbufferTextures.normal.createView() },
      { binding: 7, resource: gbufferTextures.material.createView() },
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

  // Large splat scatter bind group (group 2)
  const largeSplatScatterBindGroup = device.createBindGroup({
    label: "large_splat_scatter_bg",
    layout: resources.largeSplatScatterBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: resources.largeSplatListBuffer } },
      { binding: 1, resource: { buffer: resources.largeSplatCountBuffer } },
    ],
  });

  return { projectBindGroup, splatBindGroup, tileBindGroup, sortKeyBindGroup, reorderBindGroup, classifyBindGroup, tileDepthSortBindGroup, bucketSortBindGroup, chunkSortBindGroup, writeChunkIndirectBindGroup, sortedTileBindGroup, prefixBindGroup, largeSplatScatterBindGroup };
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
 * project → count → GPU prefix sum → scatter → classify → per-tile depth sort → composite
 *
 * All passes encoded into one command encoder — no CPU readback stalls.
 * No global radix sort: scatter writes refs directly at prefix-summed tile offsets.
 */
export function encodeFullComputeCompositorPipeline(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  const { plan } = resources;

  // Clear large splat counter before projection classifies splats
  encoder.clearBuffer(resources.largeSplatCountBuffer);

  // Pass 0: Project all splats into projection cache + classify large splats
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

  // Pass 3a: Scatter small splat tile refs (≤16 tiles) directly to prefix-summed offsets.
  encoder.clearBuffer(resources.tileCountBuffer);
  {
    const pass = encoder.beginComputePass({ label: "tile_scatter_small" });
    pass.setPipeline(resources.scatterPipeline);
    pass.setBindGroup(0, bindGroups.splatBindGroup);
    pass.setBindGroup(1, bindGroups.tileBindGroup);
    pass.setBindGroup(2, bindGroups.sortKeyBindGroup);
    pass.dispatchWorkgroups(Math.ceil(plan.splatCount / 256));
    pass.end();
  }

  // Pass 3b: Cooperative large splat scatter (>16 tiles, one workgroup per large splat)
  // Copy largeSplatCount → indirect dispatch x, then dispatch indirectly
  encoder.copyBufferToBuffer(
    resources.largeSplatCountBuffer, 0,
    resources.largeSplatIndirectBuffer, 0,
    4,
  );
  {
    const pass = encoder.beginComputePass({ label: "tile_scatter_large" });
    pass.setPipeline(resources.largeSplatScatterPipeline);
    pass.setBindGroup(0, bindGroups.splatBindGroup);
    pass.setBindGroup(1, bindGroups.tileBindGroup);
    pass.setBindGroup(2, bindGroups.largeSplatScatterBindGroup);
    pass.dispatchWorkgroupsIndirect(resources.largeSplatIndirectBuffer, 0);
    pass.end();
  }

  // Pass 5.5a: Classify tiles into small/large lists
  {
    encoder.clearBuffer(resources.tileListCountsBuffer);
    encoder.clearBuffer(resources.totalChunksBuffer);
    encoder.clearBuffer(resources.indirectDispatchBuffer);
    const classifyPass = encoder.beginComputePass({ label: "classify_tiles" });
    classifyPass.setPipeline(resources.classifyPipeline);
    classifyPass.setBindGroup(0, bindGroups.classifyBindGroup);
    classifyPass.dispatchWorkgroups(1);
    classifyPass.end();
  }

  // Pass 5.5b: Small tile bitonic sort (indirect dispatch from classify output)
  {
    const pass = encoder.beginComputePass({ label: "small_tile_sort" });
    pass.setPipeline(resources.tileDepthSortPipeline);
    pass.setBindGroup(0, bindGroups.tileDepthSortBindGroup);
    pass.dispatchWorkgroupsIndirect(resources.indirectDispatchBuffer, 0);
    pass.end();
  }

  // Pass 5.5c: Bucket pre-sort for large tiles (indirect dispatch from classify output)
  {
    const pass = encoder.beginComputePass({ label: "bucket_sort" });
    pass.setPipeline(resources.bucketSortPipeline);
    pass.setBindGroup(0, bindGroups.bucketSortBindGroup);
    pass.dispatchWorkgroupsIndirect(resources.indirectDispatchBuffer, 12);
    pass.end();
  }

  // Pass 5.5d: Write chunk indirect dispatch args (copies totalChunks → indirect buffer)
  {
    const pass = encoder.beginComputePass({ label: "write_chunk_indirect" });
    pass.setPipeline(resources.writeChunkIndirectPipeline);
    pass.setBindGroup(0, bindGroups.chunkSortBindGroup);
    pass.setBindGroup(1, bindGroups.writeChunkIndirectBindGroup);
    pass.dispatchWorkgroups(1);
    pass.end();
  }

  // Pass 5.5e: Chunk sort — indirect dispatch from totalChunks
  {
    const pass = encoder.beginComputePass({ label: "chunk_sort" });
    pass.setPipeline(resources.chunkSortPipeline);
    pass.setBindGroup(0, bindGroups.chunkSortBindGroup);
    pass.dispatchWorkgroupsIndirect(resources.indirectDispatchBuffer, 24);
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
