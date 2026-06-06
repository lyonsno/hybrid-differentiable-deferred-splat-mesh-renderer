import productionElectionPrefixScatterShader from "./shaders/gpu_production_election_prefix_scatter.wgsl?raw";
import type {
  GpuProjectionRetentionCandidateSourceInputs,
  GpuProjectionRetentionCandidateSourceProductionElection,
} from "./gpuTileCoverage.js";
import type { GpuProductionElectionConsumerContract } from "./gpuProductionElectionConsumer.js";
import { compareCompactProjectionRetentionCompositorOrder } from "./compactRetentionElection.js";

export const GPU_PRODUCTION_ELECTION_PREFIX_SCATTER_WITNESS_WORDS = 8;
const RETAINED_ROW_U32_STRIDE = 5;
const RETAINED_ROW_F32_STRIDE = 8;

export interface GpuProductionElectionPrefixScatterContractInput {
  readonly device: GPUDevice;
  readonly candidateSourceRecordsBuffer: GPUBuffer;
  readonly candidateSourceGroupsBuffer: GPUBuffer;
  readonly productionElectionComputeConsumer: GpuProductionElectionConsumerContract;
  readonly productionElection: GpuProjectionRetentionCandidateSourceProductionElection;
  readonly candidateSourceInputs: GpuProjectionRetentionCandidateSourceInputs;
  readonly tileCount: number;
  readonly tileHeaderBuffer: GPUBuffer;
  readonly tileRefBuffer: GPUBuffer;
  readonly tileCoverageWeightBuffer: GPUBuffer;
  readonly alphaParamBuffer: GPUBuffer;
  readonly maxTileRefs: number;
}

export interface GpuProductionElectionPrefixScatterContract {
  readonly source: "wgsl-production-election-prefix-scatter";
  readonly status: "prefix-scatter-contract-present";
  readonly bindGroupLayout: GPUBindGroupLayout;
  readonly pipeline: GPUComputePipeline;
  readonly bindGroup: GPUBindGroup;
  readonly materializeBindGroupLayout: GPUBindGroupLayout;
  readonly materializePipeline: GPUComputePipeline;
  readonly materializeBindGroup: GPUBindGroup;
  readonly paramsBuffer: GPUBuffer;
  readonly materializeParamsBuffer: GPUBuffer;
  readonly retainedRecordTileIndexesBuffer: GPUBuffer;
  readonly retainedRecordPayloadU32Buffer: GPUBuffer;
  readonly retainedRecordPayloadF32Buffer: GPUBuffer;
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
  readonly materializeDispatchWorkgroups: number;
  readonly nextConsumerBoundary: "current-compositor-bind-group-consumption";
  readonly currentCompositorBinding: "production-election-prefix-scatter-materialized-current-compositor-source";
  readonly falseClosureGuard: "production-election-compositor-consumption-is-not-visual-quality-or-performance-closure";
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
    candidateSourceInputs,
    tileCount,
    tileHeaderBuffer,
    tileRefBuffer,
    tileCoverageWeightBuffer,
    alphaParamBuffer,
    maxTileRefs,
  } = input;
  const retainedRecords = [...productionElection.retainedRecords].sort(compareCompactProjectionRetentionCompositorOrder);
  const retainedRecordCount = retainedRecords.length;
  const retainedRecordTileIndexes = new Uint32Array(
    retainedRecords.map((record) => record.tileIndex),
  );
  const retainedRecordClassMasks = retainedRecordClassMaskByIdentity(candidateSourceInputs);
  const retainedRecordPayloadU32 = new Uint32Array(Math.max(RETAINED_ROW_U32_STRIDE, retainedRecordCount * RETAINED_ROW_U32_STRIDE));
  const retainedRecordPayloadF32 = new Float32Array(Math.max(RETAINED_ROW_F32_STRIDE, retainedRecordCount * RETAINED_ROW_F32_STRIDE));
  const retainedRecordSlotsByTile = new Uint32Array(Math.max(tileCount, 1));
  for (let index = 0; index < retainedRecordCount; index += 1) {
    const record = retainedRecords[index];
    if (!record) {
      continue;
    }
    const u32Base = index * RETAINED_ROW_U32_STRIDE;
    const f32Base = index * RETAINED_ROW_F32_STRIDE;
    const compositorSlot =
      record.tileIndex < retainedRecordSlotsByTile.length ? retainedRecordSlotsByTile[record.tileIndex]++ : 0;
    retainedRecordPayloadU32[u32Base] = record.splatIndex;
    retainedRecordPayloadU32[u32Base + 1] = record.tileIndex;
    retainedRecordPayloadU32[u32Base + 2] =
      retainedRecordClassMasks.get(retainedRecordIdentityKey(record.tileIndex, record.splatIndex, record.originalId)) ?? 0;
    retainedRecordPayloadU32[u32Base + 3] = record.originalId;
    retainedRecordPayloadU32[u32Base + 4] = compositorSlot;
    retainedRecordPayloadF32[f32Base] = record.coverageWeight;
    retainedRecordPayloadF32[f32Base + 1] = record.opacity;
    retainedRecordPayloadF32[f32Base + 2] = record.centerPx[0];
    retainedRecordPayloadF32[f32Base + 3] = record.centerPx[1];
    retainedRecordPayloadF32[f32Base + 4] = record.inverseConic[0];
    retainedRecordPayloadF32[f32Base + 5] = record.inverseConic[1];
    retainedRecordPayloadF32[f32Base + 6] = record.inverseConic[2];
    retainedRecordPayloadF32[f32Base + 7] = record.retentionWeight;
  }
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
  const retainedRecordPayloadU32Buffer = createInitializedStorageBuffer(
    device,
    "production_election_retained_record_payload_u32",
    retainedRecordPayloadU32,
    GPUBufferUsage.STORAGE,
  );
  const retainedRecordPayloadF32Buffer = createInitializedStorageBuffer(
    device,
    "production_election_retained_record_payload_f32",
    retainedRecordPayloadF32,
    GPUBufferUsage.STORAGE,
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
  const materializeParamsBuffer = device.createBuffer({
    label: "gpu_production_election_compositor_materialize_params",
    size: 16,
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
  device.queue.writeBuffer(
    materializeParamsBuffer,
    0,
    new Uint32Array([
      retainedRecordCount,
      tileCount,
      maxTileRefs,
      RETAINED_ROW_U32_STRIDE,
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
  const materializeBindGroupLayout = device.createBindGroupLayout({
    label: "gpu_production_election_compositor_materialize_bind_group_layout",
    entries: [
      storageEntry(8, "read-only-storage"),
      storageEntry(9, "read-only-storage"),
      storageEntry(10, "storage"),
      storageEntry(11, "read-only-storage"),
      storageEntry(12, "storage"),
      storageEntry(13, "storage"),
      storageEntry(14, "storage"),
      storageEntry(15, "storage"),
      {
        binding: 16,
        visibility: GPUShaderStage.COMPUTE,
        buffer: { type: "uniform" },
      },
    ],
  });
  const materializePipelineLayout = device.createPipelineLayout({
    label: "gpu_production_election_compositor_materialize_pipeline_layout",
    bindGroupLayouts: [materializeBindGroupLayout],
  });
  const materializePipeline = device.createComputePipeline({
    label: "gpu_production_election_compositor_materialize_pipeline",
    layout: materializePipelineLayout,
    compute: {
      module: shaderModule,
      entryPoint: "materialize_production_election_compositor_source",
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
  const materializeBindGroup = device.createBindGroup({
    label: "gpu_production_election_compositor_materialize_bind_group",
    layout: materializeBindGroupLayout,
    entries: [
      { binding: 8, resource: { buffer: retainedRecordPayloadU32Buffer } },
      { binding: 9, resource: { buffer: retainedRecordPayloadF32Buffer } },
      { binding: 10, resource: { buffer: prefixCountsBuffer } },
      { binding: 11, resource: { buffer: retainedRecordIndicesBuffer } },
      { binding: 12, resource: { buffer: tileHeaderBuffer } },
      { binding: 13, resource: { buffer: tileRefBuffer } },
      { binding: 14, resource: { buffer: tileCoverageWeightBuffer } },
      { binding: 15, resource: { buffer: alphaParamBuffer } },
      { binding: 16, resource: { buffer: materializeParamsBuffer } },
    ],
  });

  return {
    source: "wgsl-production-election-prefix-scatter",
    status: "prefix-scatter-contract-present",
    bindGroupLayout,
    pipeline,
    bindGroup,
    materializeBindGroupLayout,
    materializePipeline,
    materializeBindGroup,
    paramsBuffer,
    materializeParamsBuffer,
    retainedRecordTileIndexesBuffer,
    retainedRecordPayloadU32Buffer,
    retainedRecordPayloadF32Buffer,
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
    materializeDispatchWorkgroups: Math.max(1, Math.ceil(retainedRecordCount / 64)),
    nextConsumerBoundary: "current-compositor-bind-group-consumption",
    currentCompositorBinding: "production-election-prefix-scatter-materialized-current-compositor-source",
    falseClosureGuard: "production-election-compositor-consumption-is-not-visual-quality-or-performance-closure",
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

export function materializeGpuProductionElectionCompositorSource(
  pass: GPUComputePassEncoder,
  contract: GpuProductionElectionPrefixScatterContract | undefined,
): void {
  if (!contract) {
    return;
  }
  pass.setPipeline(contract.materializePipeline);
  pass.setBindGroup(0, contract.materializeBindGroup);
  pass.dispatchWorkgroups(contract.materializeDispatchWorkgroups);
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
    contract.retainedRecordIndicesBuffer,
    0,
    new Uint32Array(Math.max(contract.retainedRecordCount, 1)),
  );
  queue.writeBuffer(
    contract.witnessBuffer,
    0,
    new Uint32Array(GPU_PRODUCTION_ELECTION_PREFIX_SCATTER_WITNESS_WORDS),
  );
}

function retainedRecordClassMaskByIdentity(
  inputs: GpuProjectionRetentionCandidateSourceInputs,
): ReadonlyMap<bigint, number> {
  const masks = new Map<bigint, number>();
  for (let recordIndex = 0; recordIndex < inputs.recordCount; recordIndex += 1) {
    const offset = recordIndex * 4;
    const tileIndex = inputs.recordU32[offset] ?? 0;
    const splatIndex = inputs.recordU32[offset + 1] ?? 0;
    const originalId = inputs.recordU32[offset + 2] ?? 0;
    const classCode = inputs.recordU32[offset + 3] ?? 0;
    const key = retainedRecordIdentityKey(tileIndex, splatIndex, originalId);
    masks.set(key, (masks.get(key) ?? 0) | candidateSourceClassMaskForCode(classCode));
  }
  return masks;
}

function retainedRecordIdentityKey(tileIndex: number, splatIndex: number, originalId: number): bigint {
  return (BigInt(tileIndex) << 128n) | (BigInt(splatIndex) << 64n) | BigInt(originalId);
}

function candidateSourceClassMaskForCode(classCode: number): number {
  switch (classCode) {
    case 1:
      return 1;
    case 2:
      return 2;
    case 3:
      return 4;
    case 4:
      return 8;
    default:
      return 0;
  }
}

function createInitializedStorageBuffer(
  device: GPUDevice,
  label: string,
  values: Uint32Array | Float32Array,
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
