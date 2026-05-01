export const GPU_ORDERING_RANKS_WORKGROUP_SIZE = 128;
export const GPU_ORDERING_RANKS_SENTINEL = 0xffffffff;

export const GPU_ORDERING_RANKS_SHADER_WGSL = /* wgsl */ `
struct Params {
  splatCount: u32,
  sortedIndexCount: u32,
  _pad0: u32,
  _pad1: u32,
};

@group(0) @binding(0) var<storage, read> sortedIndices: array<u32>;
@group(0) @binding(1) var<storage, read_write> orderingRanks: array<u32>;
@group(0) @binding(2) var<uniform> params: Params;

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) globalId: vec3u) {
  let rank = globalId.x;
  if (rank >= params.sortedIndexCount) {
    return;
  }

  let splatId = sortedIndices[rank];
  if (splatId == 0xffffffffu || splatId >= params.splatCount) {
    return;
  }

  orderingRanks[splatId] = rank;
}
`;

export interface GpuOrderingRanksPlanInput {
  readonly splatCount: number;
  readonly sortedIndexCount: number;
}

export interface GpuOrderingRanksPlan extends GpuOrderingRanksPlanInput {
  readonly dispatchWorkgroups: number;
}

export interface GpuOrderingRanker {
  readonly plan: GpuOrderingRanksPlan;
  readonly pipeline: GPUComputePipeline;
  readonly bindGroup: GPUBindGroup;
  readonly paramsBuffer: GPUBuffer;
}

export function createGpuOrderingRanksPlan(input: GpuOrderingRanksPlanInput): GpuOrderingRanksPlan {
  const splatCount = assertNonNegativeInteger(input.splatCount, "splat count");
  const sortedIndexCount = assertPositiveInteger(input.sortedIndexCount, "sorted index count");
  return {
    splatCount,
    sortedIndexCount,
    dispatchWorkgroups: Math.ceil(sortedIndexCount / GPU_ORDERING_RANKS_WORKGROUP_SIZE),
  };
}

export function simulateOrderingRanksFromSortedIndices(
  sortedIndices: ArrayLike<number>,
  splatCount: number,
): Uint32Array {
  const ranks = new Uint32Array(assertNonNegativeInteger(splatCount, "splat count"));
  ranks.fill(GPU_ORDERING_RANKS_SENTINEL);
  for (let rank = 0; rank < sortedIndices.length; rank += 1) {
    const splatId = sortedIndices[rank];
    if (splatId === GPU_ORDERING_RANKS_SENTINEL || splatId < 0 || splatId >= splatCount) {
      continue;
    }
    ranks[splatId] = rank;
  }
  return ranks;
}

export function createGpuOrderingRanker(
  device: GPUDevice,
  input: GpuOrderingRanksPlanInput,
  sortedIndexBuffer: GPUBuffer,
  orderingRankBuffer: GPUBuffer,
  label = "gpu_ordering_ranks",
): GpuOrderingRanker {
  const plan = createGpuOrderingRanksPlan(input);
  const shaderModule = device.createShaderModule({
    label: `${label}_shader`,
    code: GPU_ORDERING_RANKS_SHADER_WGSL,
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: `${label}_bind_group_layout`,
    entries: [
      storageEntry(0, "read-only-storage"),
      storageEntry(1, "storage"),
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });
  const pipeline = device.createComputePipeline({
    label: `${label}_pipeline`,
    layout: device.createPipelineLayout({
      label: `${label}_pipeline_layout`,
      bindGroupLayouts: [bindGroupLayout],
    }),
    compute: {
      module: shaderModule,
      entryPoint: "main",
    },
  });
  const paramsBuffer = createParamsBuffer(device, plan, `${label}_params`);
  const bindGroup = device.createBindGroup({
    label: `${label}_bind_group`,
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: sortedIndexBuffer } },
      { binding: 1, resource: { buffer: orderingRankBuffer } },
      { binding: 2, resource: { buffer: paramsBuffer } },
    ],
  });
  return { plan, pipeline, bindGroup, paramsBuffer };
}

export function encodeGpuOrderingRanks(encoder: GPUCommandEncoder, ranker: GpuOrderingRanker): void {
  if (ranker.plan.sortedIndexCount <= 0) {
    return;
  }
  const pass = encoder.beginComputePass({ label: "gpu_ordering_ranks" });
  pass.setPipeline(ranker.pipeline);
  pass.setBindGroup(0, ranker.bindGroup);
  pass.dispatchWorkgroups(ranker.plan.dispatchWorkgroups);
  pass.end();
}

function createParamsBuffer(device: GPUDevice, plan: GpuOrderingRanksPlan, label: string): GPUBuffer {
  const params = new Uint32Array([plan.splatCount, plan.sortedIndexCount, 0, 0]);
  const buffer = device.createBuffer({
    label,
    size: params.byteLength,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint32Array(buffer.getMappedRange()).set(params);
  buffer.unmap();
  return buffer;
}

function storageEntry(binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type },
  };
}

function assertPositiveInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value <= 0) {
    throw new Error(`${label} must be a positive integer`);
  }
  return value;
}

function assertNonNegativeInteger(value: number, label: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${label} must be a non-negative integer`);
  }
  return value;
}
