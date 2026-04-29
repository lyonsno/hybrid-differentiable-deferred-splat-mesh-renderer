export const GPU_SORT_WORKGROUP_SIZE = 128;
export const GPU_SORT_PADDED_INDEX_SENTINEL = 0xffffffff;

export const GPU_SORT_SHADER_WGSL = /* wgsl */ `
struct Params {
  count: u32,
  paddedCount: u32,
  k: u32,
  j: u32,
  descending: u32,
  _pad0: u32,
  _pad1: u32,
  _pad2: u32,
};

@group(0) @binding(0) var<storage, read_write> keys: array<f32>;
@group(0) @binding(1) var<storage, read_write> indices: array<u32>;
@group(0) @binding(2) var<uniform> params: Params;

fn should_swap(leftKey: f32, leftIndex: u32, rightKey: f32, rightIndex: u32, ascending: bool) -> bool {
  if (ascending) {
    return (leftKey > rightKey) || ((leftKey == rightKey) && (leftIndex > rightIndex));
  }

  return (leftKey < rightKey) || ((leftKey == rightKey) && (leftIndex > rightIndex));
}

@compute @workgroup_size(128)
fn main(@builtin(global_invocation_id) global_id: vec3u) {
  let i = global_id.x;
  if (i >= params.paddedCount) {
    return;
  }

  let partner = i ^ params.j;
  if (partner <= i || partner >= params.paddedCount) {
    return;
  }

  let sequenceAscending = (i & params.k) == 0u;
  let ascending = select(sequenceAscending, !sequenceAscending, params.descending == 1u);

  let leftKey = keys[i];
  let rightKey = keys[partner];
  let leftIndex = indices[i];
  let rightIndex = indices[partner];

  if (should_swap(leftKey, leftIndex, rightKey, rightIndex, ascending)) {
    keys[i] = rightKey;
    keys[partner] = leftKey;
    indices[i] = rightIndex;
    indices[partner] = leftIndex;
  }
}
`;

export interface GpuSortPass {
  readonly k: number;
  readonly j: number;
}

export interface GpuSortPrototypePlan {
  readonly count: number;
  readonly paddedCount: number;
  readonly passes: readonly GpuSortPass[];
  readonly dispatchWorkgroups: number;
}

export interface SyntheticDepthSortInput {
  readonly keys: Float32Array;
  readonly indices: Uint32Array;
}

export interface GpuSortPrototype {
  readonly plan: GpuSortPrototypePlan;
  readonly keyBuffer: GPUBuffer;
  readonly indexBuffer: GPUBuffer;
  readonly pipeline: GPUComputePipeline;
  readonly bindGroups: readonly GPUBindGroup[];
}

export function createGpuSortPrototypePlan(count: number): GpuSortPrototypePlan {
  assertValidCount(count);

  const paddedCount = nextPowerOfTwo(Math.max(1, count));
  const passes: GpuSortPass[] = [];
  for (let k = 2; k <= paddedCount; k *= 2) {
    for (let j = k / 2; j >= 1; j /= 2) {
      passes.push({ k, j });
    }
  }

  return {
    count,
    paddedCount,
    passes,
    dispatchWorkgroups: Math.ceil(paddedCount / GPU_SORT_WORKGROUP_SIZE),
  };
}

export function createSyntheticDepthSortInput(depths: ArrayLike<number>): SyntheticDepthSortInput {
  const plan = createGpuSortPrototypePlan(depths.length);
  const keys = new Float32Array(plan.paddedCount);
  const indices = new Uint32Array(plan.paddedCount);

  keys.fill(Number.NEGATIVE_INFINITY);
  indices.fill(GPU_SORT_PADDED_INDEX_SENTINEL);

  for (let i = 0; i < depths.length; i += 1) {
    keys[i] = depths[i];
    indices[i] = i;
  }

  return {
    keys,
    indices,
  };
}

export function createViewDepthSortInput(
  positions: ArrayLike<number>,
  viewMatrix: ArrayLike<number>,
): SyntheticDepthSortInput {
  const count = validatePackedPositions(positions);
  validateViewMatrix(viewMatrix);

  const plan = createGpuSortPrototypePlan(count);
  const keys = new Float32Array(plan.paddedCount);
  const indices = new Uint32Array(plan.paddedCount);

  keys.fill(Number.NEGATIVE_INFINITY);
  indices.fill(GPU_SORT_PADDED_INDEX_SENTINEL);

  for (let i = 0; i < count; i += 1) {
    keys[i] = -viewSpaceDepthUnchecked(positions, i, viewMatrix);
    indices[i] = i;
  }

  return { keys, indices };
}

export function simulateGpuSortPrototype(depths: ArrayLike<number>): Uint32Array {
  const plan = createGpuSortPrototypePlan(depths.length);
  const { keys, indices } = createSyntheticDepthSortInput(depths);

  for (const pass of plan.passes) {
    for (let i = 0; i < plan.paddedCount; i += 1) {
      const partner = i ^ pass.j;
      if (partner <= i || partner >= plan.paddedCount) {
        continue;
      }

      const sequenceAscending = (i & pass.k) === 0;
      const ascending = !sequenceAscending;
      if (shouldSwap(keys[i], indices[i], keys[partner], indices[partner], ascending)) {
        swap(keys, i, partner);
        swap(indices, i, partner);
      }
    }
  }

  return indices.filter((index) => index !== GPU_SORT_PADDED_INDEX_SENTINEL);
}

export function simulateGpuViewDepthSortPrototype(
  positions: ArrayLike<number>,
  viewMatrix: ArrayLike<number>,
): Uint32Array {
  const { keys } = createViewDepthSortInput(positions, viewMatrix);
  const count = validatePackedPositions(positions);
  return simulateGpuSortPrototype(keys.slice(0, count));
}

export function createGpuSortPrototype(device: GPUDevice, count: number, label = "gpu_sort_prototype"): GpuSortPrototype {
  const plan = createGpuSortPrototypePlan(count);
  const keyBuffer = device.createBuffer({
    label: `${label}_keys`,
    size: Math.max(4, plan.paddedCount * Float32Array.BYTES_PER_ELEMENT),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const indexBuffer = device.createBuffer({
    label: `${label}_indices`,
    size: Math.max(4, plan.paddedCount * Uint32Array.BYTES_PER_ELEMENT),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });
  const shaderModule = device.createShaderModule({
    label: `${label}_shader`,
    code: GPU_SORT_SHADER_WGSL,
  });
  const bindGroupLayout = device.createBindGroupLayout({
    label: `${label}_bind_group_layout`,
    entries: [
      {
        binding: 0,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
      {
        binding: 1,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "storage" },
      },
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
  const bindGroups = plan.passes.map((pass, passIndex) => {
    const paramsBuffer = createParamsBuffer(device, plan, pass, `${label}_params_${passIndex}`);

    return device.createBindGroup({
      label: `${label}_bind_group_${passIndex}`,
      layout: bindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: keyBuffer } },
        { binding: 1, resource: { buffer: indexBuffer } },
        { binding: 2, resource: { buffer: paramsBuffer } },
      ],
    });
  });

  return {
    plan,
    keyBuffer,
    indexBuffer,
    pipeline,
    bindGroups,
  };
}

export function writeSyntheticDepthSortInput(
  queue: GPUQueue,
  prototype: GpuSortPrototype,
  depths: ArrayLike<number>,
): SyntheticDepthSortInput {
  const input = createSyntheticDepthSortInput(depths);
  if (input.keys.length !== prototype.plan.paddedCount) {
    throw new Error(`Depth input length ${depths.length} does not match prototype count ${prototype.plan.count}.`);
  }

  queue.writeBuffer(prototype.keyBuffer, 0, input.keys);
  queue.writeBuffer(prototype.indexBuffer, 0, input.indices);
  return input;
}

export function writeViewDepthSortInput(
  queue: GPUQueue,
  prototype: GpuSortPrototype,
  positions: ArrayLike<number>,
  viewMatrix: ArrayLike<number>,
): SyntheticDepthSortInput {
  const input = createViewDepthSortInput(positions, viewMatrix);
  if (input.keys.length !== prototype.plan.paddedCount) {
    throw new Error(`Position input count ${positions.length / 3} does not match prototype count ${prototype.plan.count}.`);
  }

  queue.writeBuffer(prototype.keyBuffer, 0, input.keys);
  queue.writeBuffer(prototype.indexBuffer, 0, input.indices);
  return input;
}

export function encodeGpuSortPrototype(encoder: GPUCommandEncoder, prototype: GpuSortPrototype): void {
  if (prototype.bindGroups.length === 0) {
    return;
  }

  const pass = encoder.beginComputePass({ label: "gpu_sort_prototype" });
  pass.setPipeline(prototype.pipeline);
  for (const bindGroup of prototype.bindGroups) {
    pass.setBindGroup(0, bindGroup);
    pass.dispatchWorkgroups(prototype.plan.dispatchWorkgroups);
  }
  pass.end();
}

function assertValidCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`GPU sort count must be a non-negative integer, got ${count}.`);
  }
}

function validatePackedPositions(positions: ArrayLike<number>): number {
  if (positions.length % 3 !== 0) {
    throw new Error("positions length must be a multiple of 3");
  }
  return positions.length / 3;
}

function validateViewMatrix(viewMatrix: ArrayLike<number>): void {
  if (viewMatrix.length !== 16) {
    throw new Error("view matrix must contain 16 values");
  }
}

function viewSpaceDepthUnchecked(
  positions: ArrayLike<number>,
  splatId: number,
  viewMatrix: ArrayLike<number>,
): number {
  const offset = splatId * 3;
  return (
    viewMatrix[2] * positions[offset] +
    viewMatrix[6] * positions[offset + 1] +
    viewMatrix[10] * positions[offset + 2] +
    viewMatrix[14]
  );
}

function nextPowerOfTwo(count: number): number {
  let paddedCount = 1;
  while (paddedCount < count) {
    paddedCount *= 2;
  }
  return paddedCount;
}

function shouldSwap(leftKey: number, leftIndex: number, rightKey: number, rightIndex: number, ascending: boolean): boolean {
  if (ascending) {
    return leftKey > rightKey || (leftKey === rightKey && leftIndex > rightIndex);
  }

  return leftKey < rightKey || (leftKey === rightKey && leftIndex > rightIndex);
}

function swap<T extends Float32Array | Uint32Array>(values: T, left: number, right: number): void {
  const tmp = values[left];
  values[left] = values[right];
  values[right] = tmp;
}

function createParamsBuffer(device: GPUDevice, plan: GpuSortPrototypePlan, pass: GpuSortPass, label: string): GPUBuffer {
  const params = new Uint32Array([
    plan.count,
    plan.paddedCount,
    pass.k,
    pass.j,
    1,
    0,
    0,
    0,
  ]);
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
