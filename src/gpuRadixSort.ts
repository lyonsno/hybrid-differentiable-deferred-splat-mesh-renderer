import radixSortShader from "./shaders/gpu_radix_sort.wgsl?raw";

const WG_SIZE = 256;
const ITEMS_PER_THREAD = 4;
const ELEMENTS_PER_WG = WG_SIZE * ITEMS_PER_THREAD; // 1024
const RADIX_BUCKETS = 16; // 4 bits per pass
const NUM_PASSES = 8; // 8 passes × 4 bits = 32 bits

interface PerPassResources {
  readonly sortParamsBuffer: GPUBuffer;
  readonly sortBindGroup: GPUBindGroup;
  readonly prefixBindGroup: GPUBindGroup;
}

export interface RadixSortResources {
  readonly initKeysPipeline: GPUComputePipeline;
  readonly histogramPipeline: GPUComputePipeline;
  readonly scatterPipeline: GPUComputePipeline;
  readonly prefixScanPipeline: GPUComputePipeline;
  readonly prefixPropagatePipeline: GPUComputePipeline;
  readonly sortBindGroupLayout: GPUBindGroupLayout;
  readonly keyBuffers: [GPUBuffer, GPUBuffer];
  readonly valueBuffers: [GPUBuffer, GPUBuffer];
  readonly histogramBuffer: GPUBuffer;
  readonly blockSumsBuffer: GPUBuffer;
  readonly perPass: readonly PerPassResources[];
  readonly initBindGroup: GPUBindGroup;
  readonly initParamsBuffer: GPUBuffer;
  readonly maxElements: number;
  readonly numSortWorkgroups: number;
  readonly histogramSize: number;
  readonly numPrefixWorkgroups: number;
  destroy(): void;
}

export function createRadixSort(
  device: GPUDevice,
  maxElements: number,
): RadixSortResources {
  const shaderModule = device.createShaderModule({
    label: "radix_sort_shader",
    code: radixSortShader,
  });

  const prefixSumModule = device.createShaderModule({
    label: "radix_prefix_sum_shader",
    code: /* wgsl */`
      @group(0) @binding(0) var<storage, read_write> prefixData: array<u32>;
      @group(0) @binding(1) var<storage, read_write> blockSums: array<u32>;
      @group(0) @binding(2) var<uniform> prefixParams: vec4u;

      var<workgroup> scanBuf: array<u32, 256>;

      @compute @workgroup_size(256)
      fn scan(
        @builtin(global_invocation_id) globalId: vec3u,
        @builtin(local_invocation_id) localId: vec3u,
        @builtin(workgroup_id) groupId: vec3u,
      ) {
        let count = prefixParams.x;
        let idx = globalId.x;
        let val = select(0u, prefixData[idx], idx < count);
        scanBuf[localId.x] = val;
        workgroupBarrier();

        for (var stride = 1u; stride < 256u; stride *= 2u) {
          let partner = select(0u, scanBuf[localId.x - stride], localId.x >= stride);
          workgroupBarrier();
          scanBuf[localId.x] = scanBuf[localId.x] + partner;
          workgroupBarrier();
        }

        let exclusive = select(0u, scanBuf[localId.x - 1u], localId.x > 0u);
        if (idx < count) {
          prefixData[idx] = exclusive;
        }

        if (localId.x == 255u) {
          blockSums[groupId.x] = scanBuf[255u];
        }
      }

      @compute @workgroup_size(256)
      fn propagate(
        @builtin(global_invocation_id) globalId: vec3u,
        @builtin(workgroup_id) groupId: vec3u,
      ) {
        let count = prefixParams.x;
        let idx = globalId.x;
        if (idx >= count || groupId.x == 0u) { return; }

        var blockOffset = 0u;
        for (var b = 0u; b < groupId.x; b++) {
          blockOffset += blockSums[b];
        }
        prefixData[idx] = prefixData[idx] + blockOffset;
      }
    `,
  });

  const numSortWorkgroups = Math.ceil(maxElements / ELEMENTS_PER_WG);
  const histogramSize = RADIX_BUCKETS * numSortWorkgroups;
  const numPrefixWorkgroups = Math.ceil(histogramSize / WG_SIZE);

  const sortBindGroupLayout = device.createBindGroupLayout({
    label: "radix_sort_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "read-only-storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 3, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 4, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 5, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });

  const prefixBindGroupLayout = device.createBindGroupLayout({
    label: "radix_prefix_bgl",
    entries: [
      { binding: 0, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 1, visibility: GPUShaderStage.COMPUTE, buffer: { type: "storage" } },
      { binding: 2, visibility: GPUShaderStage.COMPUTE, buffer: { type: "uniform" } },
    ],
  });

  const sortPipelineLayout = device.createPipelineLayout({
    label: "radix_sort_pl",
    bindGroupLayouts: [sortBindGroupLayout],
  });

  const prefixPipelineLayout = device.createPipelineLayout({
    label: "radix_prefix_pl",
    bindGroupLayouts: [prefixBindGroupLayout],
  });

  const initKeysPipeline = device.createComputePipeline({
    label: "radix_init_keys",
    layout: sortPipelineLayout,
    compute: { module: shaderModule, entryPoint: "init_keys" },
  });

  const histogramPipeline = device.createComputePipeline({
    label: "radix_histogram",
    layout: sortPipelineLayout,
    compute: { module: shaderModule, entryPoint: "histogram" },
  });

  const scatterPipeline = device.createComputePipeline({
    label: "radix_scatter",
    layout: sortPipelineLayout,
    compute: { module: shaderModule, entryPoint: "scatter" },
  });

  const prefixScanPipeline = device.createComputePipeline({
    label: "radix_prefix_scan",
    layout: prefixPipelineLayout,
    compute: { module: prefixSumModule, entryPoint: "scan" },
  });

  const prefixPropagatePipeline = device.createComputePipeline({
    label: "radix_prefix_propagate",
    layout: prefixPipelineLayout,
    compute: { module: prefixSumModule, entryPoint: "propagate" },
  });

  // Allocate buffers
  const bufferSize = Math.max(16, maxElements * 4);
  const makeKVBuffer = (label: string) => device.createBuffer({
    label,
    size: bufferSize,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST | GPUBufferUsage.COPY_SRC,
  });

  const keyBuffers: [GPUBuffer, GPUBuffer] = [
    makeKVBuffer("radix_keys_a"),
    makeKVBuffer("radix_keys_b"),
  ];
  const valueBuffers: [GPUBuffer, GPUBuffer] = [
    makeKVBuffer("radix_values_a"),
    makeKVBuffer("radix_values_b"),
  ];

  const histogramBuffer = device.createBuffer({
    label: "radix_histogram",
    size: Math.max(16, histogramSize * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  const blockSumsBuffer = device.createBuffer({
    label: "radix_block_sums",
    size: Math.max(16, numPrefixWorkgroups * 4),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
  });

  // Pre-create per-pass resources with static uniform data
  const perPass: PerPassResources[] = [];
  const allParamsBuffers: GPUBuffer[] = [];

  for (let passIdx = 0; passIdx < NUM_PASSES; passIdx++) {
    const bitOffset = passIdx * 4; // 4 bits per pass
    const srcIdx = passIdx % 2;
    const dstIdx = 1 - srcIdx;

    const sortParamsBuffer = device.createBuffer({
      label: `radix_sort_params_${passIdx}`,
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    // Write static params at creation time
    device.queue.writeBuffer(sortParamsBuffer, 0,
      new Uint32Array([maxElements, bitOffset, numSortWorkgroups, 0]));

    const sortBindGroup = device.createBindGroup({
      label: `radix_sort_bg_pass${passIdx}`,
      layout: sortBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: keyBuffers[srcIdx] } },
        { binding: 1, resource: { buffer: valueBuffers[srcIdx] } },
        { binding: 2, resource: { buffer: keyBuffers[dstIdx] } },
        { binding: 3, resource: { buffer: valueBuffers[dstIdx] } },
        { binding: 4, resource: { buffer: histogramBuffer } },
        { binding: 5, resource: { buffer: sortParamsBuffer } },
      ],
    });

    // Prefix params: same for all passes (histogram size is constant)
    const prefixParamsBuffer = device.createBuffer({
      label: `radix_prefix_params_${passIdx}`,
      size: 16,
      usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
    });
    device.queue.writeBuffer(prefixParamsBuffer, 0,
      new Uint32Array([histogramSize, 0, 0, 0]));

    const prefixBindGroup = device.createBindGroup({
      label: `radix_prefix_bg_pass${passIdx}`,
      layout: prefixBindGroupLayout,
      entries: [
        { binding: 0, resource: { buffer: histogramBuffer } },
        { binding: 1, resource: { buffer: blockSumsBuffer } },
        { binding: 2, resource: { buffer: prefixParamsBuffer } },
      ],
    });

    allParamsBuffers.push(sortParamsBuffer, prefixParamsBuffer);
    perPass.push({ sortParamsBuffer, sortBindGroup, prefixBindGroup });
  }

  // Init bind group and params
  const initParamsBuffer = device.createBuffer({
    label: "radix_init_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(initParamsBuffer, 0,
    new Uint32Array([maxElements, 0, numSortWorkgroups, 0]));
  allParamsBuffers.push(initParamsBuffer);

  const initBindGroup = device.createBindGroup({
    label: "radix_init_bg",
    layout: sortBindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: keyBuffers[1] } },
      { binding: 1, resource: { buffer: valueBuffers[1] } },
      { binding: 2, resource: { buffer: keyBuffers[0] } },
      { binding: 3, resource: { buffer: valueBuffers[0] } },
      { binding: 4, resource: { buffer: histogramBuffer } },
      { binding: 5, resource: { buffer: initParamsBuffer } },
    ],
  });

  return {
    initKeysPipeline, histogramPipeline, scatterPipeline,
    prefixScanPipeline, prefixPropagatePipeline,
    sortBindGroupLayout,
    keyBuffers, valueBuffers, histogramBuffer, blockSumsBuffer,
    perPass, initBindGroup, initParamsBuffer,
    maxElements, numSortWorkgroups, histogramSize, numPrefixWorkgroups,
    destroy() {
      keyBuffers[0].destroy();
      keyBuffers[1].destroy();
      valueBuffers[0].destroy();
      valueBuffers[1].destroy();
      histogramBuffer.destroy();
      blockSumsBuffer.destroy();
      for (const buf of allParamsBuffers) buf.destroy();
    },
  };
}

/**
 * Initialize the radix sort key/value buffers.
 * Keys are set to 0xFFFFFFFF (sorts to end) and values to identity [0..N-1].
 */
export function encodeRadixSortInit(
  encoder: GPUCommandEncoder,
  resources: RadixSortResources,
): void {
  const pass = encoder.beginComputePass({ label: "radix_init_keys" });
  pass.setPipeline(resources.initKeysPipeline);
  pass.setBindGroup(0, resources.initBindGroup);
  pass.dispatchWorkgroups(Math.ceil(resources.maxElements / WG_SIZE));
  pass.end();
}

/**
 * Encode a full 32-bit radix sort (4 passes) into the command encoder.
 * Keys and values must already be in keyBuffers[0] and valueBuffers[0].
 * After encoding, sorted results are in keyBuffers[0] and valueBuffers[0]
 * (even number of passes means data ends up back in buffer A).
 *
 * All uniform data is pre-written at init time — no writeBuffer calls here.
 */
export function encodeRadixSort(
  encoder: GPUCommandEncoder,
  resources: RadixSortResources,
): void {
  const { numSortWorkgroups, numPrefixWorkgroups } = resources;

  for (let passIdx = 0; passIdx < NUM_PASSES; passIdx++) {
    const { sortBindGroup, prefixBindGroup } = resources.perPass[passIdx];

    // 1. Clear histogram
    encoder.clearBuffer(resources.histogramBuffer);

    // 2. Histogram pass
    const histPass = encoder.beginComputePass({ label: `radix_histogram_${passIdx}` });
    histPass.setPipeline(resources.histogramPipeline);
    histPass.setBindGroup(0, sortBindGroup);
    histPass.dispatchWorkgroups(numSortWorkgroups);
    histPass.end();

    // 3. Prefix sum over histogram (in-place scan)
    const scanPass = encoder.beginComputePass({ label: `radix_prefix_scan_${passIdx}` });
    scanPass.setPipeline(resources.prefixScanPipeline);
    scanPass.setBindGroup(0, prefixBindGroup);
    scanPass.dispatchWorkgroups(numPrefixWorkgroups);
    scanPass.end();

    if (numPrefixWorkgroups > 1) {
      const propagatePass = encoder.beginComputePass({ label: `radix_prefix_propagate_${passIdx}` });
      propagatePass.setPipeline(resources.prefixPropagatePipeline);
      propagatePass.setBindGroup(0, prefixBindGroup);
      propagatePass.dispatchWorkgroups(numPrefixWorkgroups);
      propagatePass.end();
    }

    // 4. Scatter pass
    const scatterPass = encoder.beginComputePass({ label: `radix_scatter_${passIdx}` });
    scatterPass.setPipeline(resources.scatterPipeline);
    scatterPass.setBindGroup(0, sortBindGroup);
    scatterPass.dispatchWorkgroups(numSortWorkgroups);
    scatterPass.end();
  }
}
