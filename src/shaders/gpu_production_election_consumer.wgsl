struct ConsumerParams {
  recordCount: u32,
  groupCount: u32,
  retainedRecordCount: u32,
  crossPoolDuplicateSuppressedCount: u32,
};

@group(0) @binding(0) var<storage, read> candidateSourceRecords: array<u32>;
@group(0) @binding(1) var<storage, read> candidateSourceGroups: array<u32>;
@group(0) @binding(2) var<uniform> consumerParams: ConsumerParams;
@group(0) @binding(3) var<storage, read_write> witnessBuffer: array<atomic<u32>>;

@compute @workgroup_size(64)
fn witness_production_election_consumer(@builtin(global_invocation_id) globalId: vec3u) {
  if (globalId.x != 0u) {
    return;
  }

  atomicStore(&witnessBuffer[0], consumerParams.recordCount);
  atomicStore(&witnessBuffer[1], consumerParams.groupCount);
  atomicStore(&witnessBuffer[2], consumerParams.retainedRecordCount);
  atomicStore(&witnessBuffer[3], consumerParams.crossPoolDuplicateSuppressedCount);
  if (consumerParams.recordCount > 0u) {
    atomicStore(&witnessBuffer[4], candidateSourceRecords[0]);
  } else {
    atomicStore(&witnessBuffer[4], 0u);
  }
  if (consumerParams.groupCount > 0u) {
    atomicStore(&witnessBuffer[5], candidateSourceGroups[0]);
  } else {
    atomicStore(&witnessBuffer[5], 0u);
  }
}
