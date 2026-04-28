export const GPU_RADIX_DEPTH_KEY_SPACE = "view-space-f32-descending";
export const GPU_RADIX_BITS_PER_PASS = 4;
export const GPU_RADIX_BUCKET_COUNT = 16;
export const GPU_RADIX_WORKGROUP_SIZE = 256;
export const GPU_RADIX_PASS_COUNT = 32 / GPU_RADIX_BITS_PER_PASS;
export const GPU_RADIX_HISTOGRAM_SHADER_WGSL = /* wgsl */ `
struct RadixParams {
  count: u32,
  bitShift: u32,
  bitMask: u32,
  bucketCount: u32
};

@group(0) @binding(0) var<storage, read> keys: array<u32>;
@group(0) @binding(1) var<storage, read_write> histograms: array<atomic<u32>>;
@group(0) @binding(2) var<uniform> params: RadixParams;

@compute @workgroup_size(256)
fn histogram(
  @builtin(global_invocation_id) global_id: vec3u,
  @builtin(workgroup_id) workgroup_id: vec3u
) {
  let i = global_id.x;
  if (i >= params.count) {
    return;
  }

  let bucket = (keys[i] >> params.bitShift) & params.bitMask;
  let histogramIndex = workgroup_id.x * params.bucketCount + bucket;
  atomicAdd(&histograms[histogramIndex], 1u);
}
`;
export const GPU_RADIX_RANK_SHADER_WGSL = /* wgsl */ `
struct RadixParams {
  count: u32,
  bitShift: u32,
  bitMask: u32,
  bucketCount: u32
};

@group(0) @binding(0) var<storage, read> keys: array<u32>;
@group(0) @binding(1) var<storage, read_write> bucketRanks: array<u32>;
@group(0) @binding(2) var<uniform> params: RadixParams;

@compute @workgroup_size(256)
fn stable_rank(@builtin(global_invocation_id) global_id: vec3u) {
  let i = global_id.x;
  if (i >= params.count) {
    return;
  }

  let bucket = (keys[i] >> params.bitShift) & params.bitMask;
  var rank = 0u;
  for (var prior = 0u; prior < i; prior = prior + 1u) {
    let priorBucket = (keys[prior] >> params.bitShift) & params.bitMask;
    if (priorBucket == bucket) {
      rank = rank + 1u;
    }
  }

  bucketRanks[i] = rank;
}
`;
export const GPU_RADIX_SCATTER_SHADER_WGSL = /* wgsl */ `
struct RadixParams {
  count: u32,
  bitShift: u32,
  bitMask: u32,
  bucketCount: u32
};

@group(0) @binding(0) var<storage, read> keysIn: array<u32>;
@group(0) @binding(1) var<storage, read> indicesIn: array<u32>;
@group(0) @binding(2) var<storage, read_write> keysOut: array<u32>;
@group(0) @binding(3) var<storage, read_write> indicesOut: array<u32>;
@group(0) @binding(4) var<storage, read> bucketOffsets: array<u32>;
@group(0) @binding(5) var<storage, read> bucketRanks: array<u32>;
@group(0) @binding(6) var<uniform> params: RadixParams;

@compute @workgroup_size(256)
fn scatter(@builtin(global_invocation_id) global_id: vec3u) {
  let i = global_id.x;
  if (i >= params.count) {
    return;
  }

  let key = keysIn[i];
  let bucket = (key >> params.bitShift) & params.bitMask;
  let dst = bucketOffsets[bucket] + bucketRanks[i];
  keysOut[dst] = key;
  indicesOut[dst] = indicesIn[i];
}
`;

const F32 = new Float32Array(1);
const F32_BITS = new Uint32Array(F32.buffer);

export interface GpuRadixSortPass {
  readonly passIndex: number;
  readonly bitShift: number;
  readonly bitMask: number;
}

export interface GpuRadixSortPrototypePlan {
  readonly count: number;
  readonly keySpace: string;
  readonly bitsPerPass: number;
  readonly bucketCount: number;
  readonly passCount: number;
  readonly workgroupSize: number;
  readonly workgroupCount: number;
  readonly histogramBins: number;
  readonly keyBufferBytes: number;
  readonly indexBufferBytes: number;
  readonly rankBufferBytes: number;
  readonly histogramBufferBytes: number;
  readonly passes: readonly GpuRadixSortPass[];
}

export interface GpuRadixDepthSortInput {
  readonly keySpace: string;
  readonly keys: Uint32Array;
  readonly indices: Uint32Array;
}

export interface GpuRadixSortedKeyIndices {
  readonly keys: Uint32Array;
  readonly indices: Uint32Array;
}

export function depthToDescendingRadixKey(depth: number): number {
  if (Number.isNaN(depth)) {
    throw new Error("Cannot radix-sort NaN view-space depth.");
  }

  return (~float32ToAscendingRadixKey(depth)) >>> 0;
}

export function createGpuRadixSortPrototypePlan(count: number): GpuRadixSortPrototypePlan {
  assertValidCount(count);

  const passes: GpuRadixSortPass[] = [];
  const bitMask = GPU_RADIX_BUCKET_COUNT - 1;
  for (let passIndex = 0; passIndex < GPU_RADIX_PASS_COUNT; passIndex += 1) {
    passes.push({
      passIndex,
      bitShift: passIndex * GPU_RADIX_BITS_PER_PASS,
      bitMask,
    });
  }

  const workgroupCount = count === 0 ? 0 : Math.ceil(count / GPU_RADIX_WORKGROUP_SIZE);

  return {
    count,
    keySpace: GPU_RADIX_DEPTH_KEY_SPACE,
    bitsPerPass: GPU_RADIX_BITS_PER_PASS,
    bucketCount: GPU_RADIX_BUCKET_COUNT,
    passCount: GPU_RADIX_PASS_COUNT,
    workgroupSize: GPU_RADIX_WORKGROUP_SIZE,
    workgroupCount,
    histogramBins: workgroupCount * GPU_RADIX_BUCKET_COUNT,
    keyBufferBytes: count * Uint32Array.BYTES_PER_ELEMENT,
    indexBufferBytes: count * Uint32Array.BYTES_PER_ELEMENT,
    rankBufferBytes: count * Uint32Array.BYTES_PER_ELEMENT,
    histogramBufferBytes: workgroupCount * GPU_RADIX_BUCKET_COUNT * Uint32Array.BYTES_PER_ELEMENT,
    passes,
  };
}

export function createRadixDepthSortInput(depths: ArrayLike<number>): GpuRadixDepthSortInput {
  const keys = new Uint32Array(depths.length);
  const indices = new Uint32Array(depths.length);

  for (let i = 0; i < depths.length; i += 1) {
    keys[i] = depthToDescendingRadixKey(depths[i]);
    indices[i] = i;
  }

  return {
    keySpace: GPU_RADIX_DEPTH_KEY_SPACE,
    keys,
    indices,
  };
}

export function simulateGpuRadixSortPrototype(depths: ArrayLike<number>): Uint32Array {
  return simulateGpuRadixSortKeys(createRadixDepthSortInput(depths)).indices;
}

export function simulateGpuRadixSortKeys(input: GpuRadixDepthSortInput): GpuRadixSortedKeyIndices {
  if (input.keys.length !== input.indices.length) {
    throw new Error(`Radix key/index length mismatch: ${input.keys.length} keys for ${input.indices.length} indices.`);
  }

  const plan = createGpuRadixSortPrototypePlan(input.keys.length);
  let keysIn = new Uint32Array(input.keys);
  let indicesIn = new Uint32Array(input.indices);
  let keysOut = new Uint32Array(input.keys.length);
  let indicesOut = new Uint32Array(input.indices.length);

  for (const pass of plan.passes) {
    const counts = new Uint32Array(plan.bucketCount);
    for (let i = 0; i < keysIn.length; i += 1) {
      counts[bucketForPass(keysIn[i], pass)] += 1;
    }

    const offsets = new Uint32Array(plan.bucketCount);
    for (let bucket = 1; bucket < plan.bucketCount; bucket += 1) {
      offsets[bucket] = offsets[bucket - 1] + counts[bucket - 1];
    }

    const cursors = new Uint32Array(offsets);
    for (let i = 0; i < keysIn.length; i += 1) {
      const bucket = bucketForPass(keysIn[i], pass);
      const dst = cursors[bucket];
      cursors[bucket] += 1;
      keysOut[dst] = keysIn[i];
      indicesOut[dst] = indicesIn[i];
    }

    [keysIn, keysOut] = [keysOut, keysIn];
    [indicesIn, indicesOut] = [indicesOut, indicesIn];
  }

  return {
    keys: keysIn,
    indices: indicesIn,
  };
}

function assertValidCount(count: number): void {
  if (!Number.isInteger(count) || count < 0) {
    throw new Error(`GPU radix sort count must be a non-negative integer, got ${count}.`);
  }
}

function bucketForPass(key: number, pass: GpuRadixSortPass): number {
  return (key >>> pass.bitShift) & pass.bitMask;
}

function float32ToAscendingRadixKey(value: number): number {
  const bits = float32Bits(Object.is(value, -0) ? 0 : value);
  if ((bits & 0x80000000) !== 0) {
    return (~bits) >>> 0;
  }

  return (bits ^ 0x80000000) >>> 0;
}

function float32Bits(value: number): number {
  F32[0] = value;
  return F32_BITS[0] >>> 0;
}
