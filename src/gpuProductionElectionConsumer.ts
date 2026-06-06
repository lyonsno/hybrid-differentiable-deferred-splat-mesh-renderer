import productionElectionConsumerShader from "./shaders/gpu_production_election_consumer.wgsl?raw";
import type { GpuProjectionRetentionCandidateSourceProductionElection } from "./gpuTileCoverage.js";

export const GPU_PRODUCTION_ELECTION_CONSUMER_WITNESS_WORDS = 6;

export interface GpuProductionElectionConsumerContractInput {
  readonly device: GPUDevice;
  readonly candidateSourceRecordsBuffer: GPUBuffer;
  readonly candidateSourceGroupsBuffer: GPUBuffer;
  readonly productionElection: GpuProjectionRetentionCandidateSourceProductionElection;
}

export interface GpuProductionElectionConsumerContract {
  readonly source: "wgsl-production-election-compute-consumer";
  readonly status: "compute-consumer-contract-present";
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly pipeline: GPUComputePipeline;
  readonly bindGroup: GPUBindGroup;
  readonly paramsBuffer: GPUBuffer;
  readonly witnessBuffer: GPUBuffer;
  readonly recordCount: number;
  readonly groupCount: number;
  readonly retainedRecordCount: number;
  readonly crossPoolDuplicateSuppressedCount: number;
  readonly consumedRuntimeBuffers: readonly [
    "candidate-source-records-storage-buffer",
    "candidate-source-groups-storage-buffer",
  ];
  readonly outputWitness: "production-election-consumer-witness-buffer";
  readonly nextConsumerBoundary: "wgsl-production-election-prefix-scatter";
  readonly currentCompositorBinding: "forbidden-current-compositor-bind-group-full";
  readonly falseClosureGuard: "wgsl-production-election-compute-consumer-is-not-current-compositor-bind-group-consumption";
}

export function createGpuProductionElectionConsumerContract(
  input: GpuProductionElectionConsumerContractInput,
): GpuProductionElectionConsumerContract {
  const { device, candidateSourceRecordsBuffer, candidateSourceGroupsBuffer, productionElection } = input;
  const bindGroupLayout = device.createBindGroupLayout({
    label: "gpu_production_election_consumer_bind_group_layout",
    entries: [
      storageEntry(0, "read-only-storage"),
      storageEntry(1, "read-only-storage"),
      {
        binding: 2,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
      storageEntry(3, "storage"),
    ],
  });
  const shaderModule = device.createShaderModule({
    label: "gpu_production_election_consumer_shader",
    code: productionElectionConsumerShader,
  });
  const pipelineLayout = device.createPipelineLayout({
    label: "gpu_production_election_consumer_pipeline_layout",
    bindGroupLayouts: [bindGroupLayout],
  });
  const pipeline = device.createComputePipeline({
    label: "gpu_production_election_consumer_witness_pipeline",
    layout: pipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: "witness_production_election_consumer",
    },
  });
  const paramsBuffer = device.createBuffer({
    label: "gpu_production_election_consumer_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    paramsBuffer,
    0,
    new Uint32Array([
      productionElection.recordCount,
      productionElection.groupCount,
      productionElection.retainedRecords.length,
      productionElection.crossPoolDuplicateSuppressedCount,
    ]),
  );
  const witnessBuffer = device.createBuffer({
    label: "gpu_production_election_consumer_witness",
    size: GPU_PRODUCTION_ELECTION_CONSUMER_WITNESS_WORDS * Uint32Array.BYTES_PER_ELEMENT,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_SRC,
  });
  const bindGroup = device.createBindGroup({
    label: "gpu_production_election_consumer_bind_group",
    layout: bindGroupLayout,
    entries: [
      { binding: 0, resource: { buffer: candidateSourceRecordsBuffer } },
      { binding: 1, resource: { buffer: candidateSourceGroupsBuffer } },
      { binding: 2, resource: { buffer: paramsBuffer } },
      { binding: 3, resource: { buffer: witnessBuffer } },
    ],
  });

  return {
    source: "wgsl-production-election-compute-consumer",
    status: "compute-consumer-contract-present",
    bindGroupLayout,
    pipeline,
    bindGroup,
    paramsBuffer,
    witnessBuffer,
    recordCount: productionElection.recordCount,
    groupCount: productionElection.groupCount,
    retainedRecordCount: productionElection.retainedRecords.length,
    crossPoolDuplicateSuppressedCount: productionElection.crossPoolDuplicateSuppressedCount,
    consumedRuntimeBuffers: [
      "candidate-source-records-storage-buffer",
      "candidate-source-groups-storage-buffer",
    ],
    outputWitness: "production-election-consumer-witness-buffer",
    nextConsumerBoundary: "wgsl-production-election-prefix-scatter",
    currentCompositorBinding: "forbidden-current-compositor-bind-group-full",
    falseClosureGuard: "wgsl-production-election-compute-consumer-is-not-current-compositor-bind-group-consumption",
  };
}

function storageEntry(binding: number, type: GPUBufferBindingType): GPUBindGroupLayoutEntry {
  return {
    binding,
    visibility: GPUShaderStage.COMPUTE,
    buffer: { type },
  };
}
