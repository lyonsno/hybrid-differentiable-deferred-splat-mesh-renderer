import productionElectionPrefixScatterShader from "./shaders/gpu_production_election_prefix_scatter.wgsl?raw";
import type { GpuProjectionRetentionCandidateSourceProductionElection } from "./gpuTileCoverage.js";
import type { GpuProductionElectionConsumerContract } from "./gpuProductionElectionConsumer.js";

export const GPU_PRODUCTION_ELECTION_PREFIX_SCATTER_WITNESS_WORDS = 8;

export interface GpuProductionElectionPrefixScatterContractInput {
  readonly device: GPUDevice;
  readonly candidateSourceRecordsBuffer: GPUBuffer;
  readonly candidateSourceGroupsBuffer: GPUBuffer;
  readonly productionElectionComputeConsumer: GpuProductionElectionConsumerContract;
  readonly productionElection: GpuProjectionRetentionCandidateSourceProductionElection;
  readonly tileCount: number;
}

export interface GpuProductionElectionPrefixScatterContract {
  readonly source: "wgsl-production-election-prefix-scatter";
  readonly status: "prefix-scatter-contract-present";
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly pipeline: GPUComputePipeline;
  readonly bindGroup: GPUBindGroup;
  readonly paramsBuffer: GPUBuffer;
  readonly retainedRecordTileIndexesBuffer: GPUBuffer;
  readonly prefixCountsBuffer: GPUBuffer;
  readonly prefixOffsetsBuffer: GPUBuffer;
  readonly retainedRecordIndicesBuffer: GPUBuffer;
  readonly witnessBuffer: GPUBuffer;
  readonly recordCount: number;
  readonly groupCount: number;
  readonly retainedRecordCount: number;
  readonly tileCount: number;
  readonly consumedComputeConsumer: "wgsl-production-election-compute-consumer";
  readonly consumedRuntimeBuffers: readonly [
    "candidate-source-records-storage-buffer",
    "candidate-source-groups-storage-buffer",
    "production-election-retained-record-tile-index-buffer",
  ];
  readonly outputBuffers: readonly [
    "production-election-prefix-counts-buffer",
    "production-election-prefix-offsets-buffer",
    "production-election-retained-record-indices-buffer",
  ];
  readonly outputWitness: "production-election-prefix-scatter-witness-buffer";
  readonly dispatchWorkgroups: number;
  readonly nextConsumerBoundary: "current-compositor-bind-group-consumption";
  readonly currentCompositorBinding: "forbidden-current-compositor-bind-group-full";
  readonly falseClosureGuard: "wgsl-production-election-prefix-scatter-is-not-current-compositor-bind-group-consumption";
}

export function createGpuProductionElectionPrefixScatterContract(
  input: GpuProductionElectionPrefixScatterContractInput,
): GpuProductionElectionPrefixScatterContract {
  const {
    device,
    candidateSourceRecordsBuffer,
    candidateSourceGroupsBuffer,
    productionElectionComputeConsumer,
    productionElection,
    tileCount,
  } = input;
  const retainedRecordCount = productionElection.retainedRecords.length;
  const retainedRecordTileIndexes = new Uint32Array(
    productionElection.retainedRecords.map((record) => record.tileIndex),
  );
  const retainedRecordTileIndexesBuffer = createInitializedStorageBuffer(
    device,
    "production_election_retained_record_tile_indexes",
    retainedRecordTileIndexes,
    GPUBufferUsage.STORAGE,
  );
  const prefixCountsBuffer = createZeroedStorageBuffer(
    device,
    "production_election_prefix_counts",
    Math.max(16, tileCount * Uint32Array.BYTES_PER_ELEMENT),
  );
  const prefixOffsetsBuffer = createZeroedStorageBuffer(
    device,
    "production_election_prefix_offsets",
    Math.max(16, tileCount * Uint32Array.BYTES_PER_ELEMENT),
  );
  const retainedRecordIndicesBuffer = createZeroedStorageBuffer(
    device,
    "production_election_retained_record_indices",
    Math.max(16, Math.max(retainedRecordCount, 1) * Uint32Array.BYTES_PER_ELEMENT),
  );
  const paramsBuffer = device.createBuffer({
    label: "gpu_production_election_prefix_scatter_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    paramsBuffer,
    0,
    new Uint32Array([
      productionElection.recordCount,
      productionElection.groupCount,
      retainedRecordCount,
      tileCount,
    ]),
  );
  const witnessBuffer = createZeroedStorageBuffer(
    device,
    "gpu_production_election_prefix_scatter_witness",
    GPU_PRODUCTION_ELECTION_PREFIX_SCATTER_WITNESS_WORDS * Uint32Array.BYTES_PER_ELEMENT,
  );
  const bindGroupLayout = device.createBindGroupLayout({
    label: "gpu_production_election_prefix_scatter_bind_group_layout",
    entries: [
      storageEntry(0, "read-only-storage"),
      storageEntry(1, "read-only-storage"),
      storageEntry(2, "storage"),
      storageEntry(3, "storage"),
      storageEntry(4, "storage"),
      storageEntry(5, "read-only-storage"),
      {
        binding: 6,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      storageEntry(7, "storage"),
    ],
  });
  const shaderModule = device.createShaderModule({
    label: "gpu_production_election_prefix_scatter_shader",
    code: productionElectionPrefixScatterShader,
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "gpu_production_election_prefix_scatter_pipeline_layout",
    bindGroupLayouts: [bindGroupLayout],
  });
  const pipeline = device.createComputePipeline({
    label: "gpu_production_election_prefix_scatter_pipeline",
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: "scatter_production_election_prefix",
    },
  });
  const bindGroup = device.createBindGroup({
    label: "gpu_production_election_prefix_scatter_bind_group",
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: candidateSourceRecordsBuffer } },
      { binding: 1, resource: { buffer: candidateSourceGroupsBuffer } },
      { binding: 2, resource: { buffer: prefixCountsBuffer } },
      { binding: 3, resource: { buffer: prefixOffsetsBuffer } },
      { binding: 4, resource: { buffer: retainedRecordIndicesBuffer } },
      { binding: 5, resource: { buffer: retainedRecordTileIndexesBuffer } },
      { binding: 6, resource: { buffer: paramsBuffer } },
      { binding: 7, resource: { buffer: witnessBuffer } },
    ],
  });

  return {
    source: "wgsl-production-election-prefix-scatter",
    status: "prefix-scatter-contract-present",
    bindGroupLayout,
    pipeline,
    bindGroup,
    paramsBuffer,
    retainedRecordTileIndexesBuffer,
    prefixCountsBuffer,
    prefixOffsetsBuffer,
    retainedRecordIndicesBuffer,
    witnessBuffer,
    recordCount: productionElectionComputeConsumer.recordCount,
    groupCount: productionElectionComputeConsumer.groupCount,
    retainedRecordCount,
    tileCount,
    consumedComputeConsumer: "wgsl-production-election-compute-consumer",
    consumedRuntimeBuffers: [
      "candidate-source-records-storage-buffer",
      "candidate-source-groups-storage-buffer",
      "production-election-retained-record-tile-index-buffer",
    ],
    outputBuffers: [
      "production-election-prefix-counts-buffer",
      "production-election-prefix-offsets-buffer",
      "production-election-retained-record-indices-buffer",
    ],
    outputWitness: "production-election-prefix-scatter-witness-buffer",
    dispatchWorkgroups: Math.max(1, Math.ceil(retainedRecordCount / 64)),
    nextConsumerBoundary: "current-compositor-bind-group-consumption",
    currentCompositorBinding: "forbidden-current-compositor-bind-group-full",
    falseClosureGuard: "wgsl-production-election-prefix-scatter-is-not-current-compositor-bind-group-consumption",
  };
}

export function dispatchGpuProductionElectionPrefixScatter(
  pass: GPUComputePassEncoder,
  contract: GpuProductionElectionPrefixScatterContract | undefined,
): void {
  if (!contract) {
    return;
  }
  pass.setPipeline(contract.pipeline);
  pass.setBindGroup(0, contract.bindGroup);
  pass.dispatchWorkgroups(contract.dispatchWorkgroups);
}

export function resetGpuProductionElectionPrefixScatter(
  queue: GPUQueue,
  contract: GpuProductionElectionPrefixScatterContract | undefined,
): void {
  if (!contract) {
    return;
  }
  queue.writeBuffer(contract.prefixCountsBuffer, 0, new Uint32Array(Math.max(contract.tileCount, 1)));
  queue.writeBuffer(contract.prefixOffsetsBuffer, 0, new Uint32Array(Math.max(contract.tileCount, 1)));
  queue.writeBuffer(
    contract.witnessBuffer,
    0,
    new Uint32Array(GPU_PRODUCTION_ELECTION_PREFIX_SCATTER_WITNESS_WORDS),
  );
}

function createInitializedStorageBuffer(
  device: GPUDevice,
  label: string,
  values: Uint32Array,
  usage: GPUBufferUsageFlags,
): GPUBuffer {
  const byteLength = Math.max(16, values.byteLength);
  const buffer = device.createBuffer({
    label,
    size: byteLength,
    usage: usage | GPUBufferUsage.COPY_DST,
  });
  if (values.byteLength > 0) {
    device.queue.writeBuffer(buffer, 0, values);
  }
  return buffer;
}

function createZeroedStorageBuffer(device: GPUDevice, label: string, byteLength: number): GPUBuffer {
  return device.createBuffer({
    label,
    size: Math.max(16, byteLength),
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC | GPUBufferUsage.COPY_DST,
  });
}

function storageEntry(binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type },
  };
}
