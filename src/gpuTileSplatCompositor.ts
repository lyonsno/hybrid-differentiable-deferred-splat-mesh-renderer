import tileSplatCompositeShader from "./shaders/gpu_tile_splat_composite.wgsl?raw";

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
  readonly sortPipeline: GPUComputePipeline;
  readonly compositePipeline: GPUComputePipeline;
  readonly splatBindGroupLayout: GPUBindGroupLayout;
  readonly tileBindGroupLayout: GPUBindGroupLayout;
  readonly tileCountBuffer: GPUBuffer;
  readonly tileOffsetBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly frameUniformBuffer: GPUBuffer;
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

  const tileBindGroupLayout = device.createBindGroupLayout({
    label: "tile_splat_tile_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, storageTexture: { access: "write-only", format: "rgba16float" } },
    ],
  });

  const pipelineLayout = device.createPipelineLayout({
    label: "tile_splat_pl",
    bindGroupLayouts: [splatBindGroupLayout, tileBindGroupLayout],
  });

  const countPipeline = device.createComputePipeline({
    label: "tile_splat_count_pipeline",
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: "count_tile_refs" },
  });
  const scatterPipeline = device.createComputePipeline({
    label: "tile_splat_scatter_pipeline",
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: "scatter_tile_refs" },
  });
  const sortPipeline = device.createComputePipeline({
    label: "tile_splat_sort_pipeline",
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: "sort_tile_refs" },
  });
  const compositePipeline = device.createComputePipeline({
    label: "tile_splat_composite_pipeline",
    layout: pipelineLayout,
    compute: { module: shaderModule, entryPoint: "composite" },
  });

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
  const tileRefBuffer = device.createBuffer({
    label: "tile_splat_tile_refs",
    size: Math.max(16, plan.maxTotalTileRefs * TILE_REF_BYTES),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  return {
    plan, countPipeline, scatterPipeline, sortPipeline, compositePipeline,
    splatBindGroupLayout, tileBindGroupLayout,
    tileCountBuffer, tileOffsetBuffer, tileRefBuffer, frameUniformBuffer,
    destroy() {
      frameUniformBuffer.destroy();
      tileCountBuffer.destroy();
      tileOffsetBuffer.destroy();
      tileRefBuffer.destroy();
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
  return {
    splatBindGroup: device.createBindGroup({
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
    }),
    tileBindGroup: device.createBindGroup({
      label: "tile_splat_tile_bg",
      layout: resources.tileBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: resources.tileCountBuffer } },
        { binding: 1, resource: { buffer: resources.tileOffsetBuffer } },
        { binding: 2, resource: { buffer: resources.tileRefBuffer } },
        { binding: 3, resource: outputTexture.createView() },
      ],
    }),
  };
}

export function encodeTileSplatCountPass(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  encoder.clearBuffer(resources.tileCountBuffer);
  const pass = encoder.beginComputePass({ label: "tile_splat_count" });
  pass.setPipeline(resources.countPipeline);
  pass.setBindGroup(0, bindGroups.splatBindGroup);
  pass.setBindGroup(1, bindGroups.tileBindGroup);
  pass.dispatchWorkgroups(Math.ceil(resources.plan.splatCount / 256));
  pass.end();
}

export function encodeTileSplatScatterPass(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  const pass = encoder.beginComputePass({ label: "tile_splat_scatter" });
  pass.setPipeline(resources.scatterPipeline);
  pass.setBindGroup(0, bindGroups.splatBindGroup);
  pass.setBindGroup(1, bindGroups.tileBindGroup);
  pass.dispatchWorkgroups(Math.ceil(resources.plan.splatCount / 256));
  pass.end();
}

export function encodeTileSplatSortPass(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  const pass = encoder.beginComputePass({ label: "tile_splat_sort" });
  pass.setPipeline(resources.sortPipeline);
  pass.setBindGroup(0, bindGroups.splatBindGroup);
  pass.setBindGroup(1, bindGroups.tileBindGroup);
  // One workgroup per tile
  pass.dispatchWorkgroups(resources.plan.tileCount);
  pass.end();
}

export function encodeTileSplatCompositePass(
  encoder: GPUCommandEncoder,
  resources: TileSplatCompositorResources,
  bindGroups: TileSplatCompositorBindGroups,
): void {
  const pass = encoder.beginComputePass({ label: "tile_splat_composite" });
  pass.setPipeline(resources.compositePipeline);
  pass.setBindGroup(0, bindGroups.splatBindGroup);
  pass.setBindGroup(1, bindGroups.tileBindGroup);
  pass.dispatchWorkgroups(
    Math.ceil(resources.plan.viewportWidth / 8),
    Math.ceil(resources.plan.viewportHeight / 8),
  );
  pass.end();
}
