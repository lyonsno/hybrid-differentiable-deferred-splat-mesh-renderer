struct PrefixScatterParams {
  recordCount: u32,
  groupCount: u32,
  retainedRecordCount: u32,
  tileCount: u32,
};

@group(0) @binding(0) var<storage, read> candidateSourceRecords: array<u32>;
@group(0) @binding(1) var<storage, read> candidateSourceGroups: array<u32>;
@group(0) @binding(2) var<storage, read_write> prefixCounts: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> prefixOffsets: array<u32>;
@group(0) @binding(4) var<storage, read_write> retainedRecordIndices: array<u32>;
@group(0) @binding(5) var<storage, read> retainedRecordTileIndexes: array<u32>;
@group(0) @binding(6) var<uniform> prefixScatterParams: PrefixScatterParams;
@group(0) @binding(7) var<storage, read_write> witnessBuffer: array<atomic<u32>>;

@compute @workgroup_size(64)
fn scatter_production_election_prefix(@builtin(global_invocation_id) globalId: vec3u) {
  let retainedRecordIndex = globalId.x;
  if (retainedRecordIndex < prefixScatterParams.retainedRecordCount) {
    let tileIndex = retainedRecordTileIndexes[retainedRecordIndex];
    if (tileIndex < prefixScatterParams.tileCount) {
      let slot = atomicAdd(&prefixCounts[tileIndex], 1u);
      retainedRecordIndices[retainedRecordIndex] = retainedRecordIndex;
      prefixOffsets[tileIndex] = max(prefixOffsets[tileIndex], slot + 1u);
    }
  }

  if (globalId.x != 0u) {
    return;
  }

  atomicStore(&witnessBuffer[0], prefixScatterParams.recordCount);
  atomicStore(&witnessBuffer[1], prefixScatterParams.groupCount);
  atomicStore(&witnessBuffer[2], prefixScatterParams.retainedRecordCount);
  atomicStore(&witnessBuffer[3], prefixScatterParams.tileCount);
  if (prefixScatterParams.recordCount > 0u) {
    atomicStore(&witnessBuffer[4], candidateSourceRecords[0]);
  } else {
    atomicStore(&witnessBuffer[4], 0u);
  }
  if (prefixScatterParams.groupCount > 0u) {
    atomicStore(&witnessBuffer[5], candidateSourceGroups[0]);
  } else {
    atomicStore(&witnessBuffer[5], 0u);
  }
  if (prefixScatterParams.retainedRecordCount > 0u) {
    atomicStore(&witnessBuffer[6], retainedRecordTileIndexes[0]);
  } else {
    atomicStore(&witnessBuffer[6], 0u);
  }
  atomicStore(&witnessBuffer[7], 1u);
}
