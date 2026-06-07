struct PrefixScatterParams {
  recordCount: u32,
  groupCount: u32,
  retainedRecordCount: u32,
  tileCount: u32,
};

struct MaterializeParams {
  retainedRecordCount: u32,
  tileCount: u32,
  maxTileRefs: u32,
  projectedContributorU32Stride: u32,
};

@group(0) @binding(0) var<storage, read> candidateSourceRecords: array<u32>;
@group(0) @binding(1) var<storage, read> candidateSourceGroups: array<u32>;
@group(0) @binding(2) var<storage, read_write> prefixCounts: array<atomic<u32>>;
@group(0) @binding(3) var<storage, read_write> prefixOffsets: array<atomic<u32>>;
@group(0) @binding(4) var<storage, read_write> retainedRecordIndices: array<u32>;
@group(0) @binding(5) var<storage, read> retainedRecordTileIndexes: array<u32>;
@group(0) @binding(6) var<uniform> prefixScatterParams: PrefixScatterParams;
@group(0) @binding(7) var<storage, read_write> witnessBuffer: array<atomic<u32>>;

@group(0) @binding(8) var<storage, read> projectedContributorU32: array<u32>;
@group(0) @binding(9) var<storage, read> projectedContributorF32: array<f32>;
@group(0) @binding(10) var<storage, read_write> materializedPrefixCounts: array<atomic<u32>>;
@group(0) @binding(11) var<storage, read> materializedRetainedRecordIndices: array<u32>;
@group(0) @binding(12) var<storage, read_write> tileHeaders: array<vec4u>;
@group(0) @binding(13) var<storage, read_write> tileRefs: array<atomic<u32>>;
@group(0) @binding(14) var<storage, read_write> tileCoverageWeights: array<f32>;
@group(0) @binding(15) var<storage, read_write> alphaParams: array<vec4f>;
@group(0) @binding(16) var<uniform> materializeParams: MaterializeParams;

const SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL = -1024.0;
const PROJECTED_CONTRIBUTOR_F32_STRIDE = 16u;
const PROJECTED_CONTRIBUTOR_CLASS_MASK_FIELD = 5u;
const PROJECTED_CONTRIBUTOR_COMPOSITOR_SLOT_FIELD = 6u;

@compute @workgroup_size(64)
fn scatter_production_election_prefix(@builtin(global_invocation_id) globalId: vec3u) {
  let retainedRecordIndex = globalId.x;
  if (retainedRecordIndex < prefixScatterParams.retainedRecordCount) {
    let tileIndex = retainedRecordTileIndexes[retainedRecordIndex];
    if (tileIndex < prefixScatterParams.tileCount) {
      let slot = atomicAdd(&prefixCounts[tileIndex], 1u);
      retainedRecordIndices[retainedRecordIndex] = slot;
      atomicMax(&prefixOffsets[tileIndex], slot + 1u);
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

fn materialize_tile_ref_word_index(refIndex: u32, component: u32) -> u32 {
  return refIndex * 4u + component;
}

fn materialized_tile_ref_capacity_per_tile() -> u32 {
  return max(materializeParams.maxTileRefs / max(materializeParams.tileCount, 1u), 1u);
}

fn materialized_retention_score(retentionWeight: f32) -> u32 {
  return max(min(u32(max(retentionWeight, 0.0) * 65535.0), 0x7fffffffu), 1u);
}

fn projected_u32(index: u32, field: u32) -> u32 {
  return projectedContributorU32[index * materializeParams.projectedContributorU32Stride + field];
}

fn projected_f32(index: u32, field: u32) -> f32 {
  return projectedContributorF32[index * PROJECTED_CONTRIBUTOR_F32_STRIDE + field];
}

@compute @workgroup_size(64)
fn materialize_production_election_compositor_source(@builtin(global_invocation_id) globalId: vec3u) {
  let retainedRecordIndex = globalId.x;
  if (retainedRecordIndex >= materializeParams.retainedRecordCount) {
    return;
  }

  let splatIndex = projected_u32(retainedRecordIndex, 0u);
  let tileIndex = projected_u32(retainedRecordIndex, 2u);
  let candidateSourceClassMask = projected_u32(retainedRecordIndex, PROJECTED_CONTRIBUTOR_CLASS_MASK_FIELD);
  if (tileIndex >= materializeParams.tileCount) {
    return;
  }

  let tileCapacity = materialized_tile_ref_capacity_per_tile();
  let slot = projected_u32(retainedRecordIndex, PROJECTED_CONTRIBUTOR_COMPOSITOR_SLOT_FIELD);
  if (slot >= tileCapacity) {
    return;
  }

  let retainedCount = min(atomicLoad(&materializedPrefixCounts[tileIndex]), tileCapacity);
  let firstRefIndex = tileIndex * tileCapacity;
  let refIndex = firstRefIndex + slot;
  if (refIndex >= materializeParams.maxTileRefs) {
    return;
  }

  tileHeaders[tileIndex] = vec4u(firstRefIndex, retainedCount, retainedCount, 0u);
  atomicStore(&tileRefs[materialize_tile_ref_word_index(refIndex, 0u)], splatIndex);
  atomicStore(
    &tileRefs[materialize_tile_ref_word_index(refIndex, 1u)],
    materialized_retention_score(projected_f32(retainedRecordIndex, 11u))
  );
  atomicStore(&tileRefs[materialize_tile_ref_word_index(refIndex, 2u)], tileIndex);
  atomicStore(&tileRefs[materialize_tile_ref_word_index(refIndex, 3u)], refIndex);
  tileCoverageWeights[refIndex] = max(projected_f32(retainedRecordIndex, 2u), 0.0);

  let sourceOpacity = clamp(projected_f32(retainedRecordIndex, 8u), 0.0, 0.999);
  let centerPx = vec2f(projected_f32(retainedRecordIndex, 3u), projected_f32(retainedRecordIndex, 4u));
  let inverseConic = vec3f(
    projected_f32(retainedRecordIndex, 5u),
    projected_f32(retainedRecordIndex, 6u),
    projected_f32(retainedRecordIndex, 7u),
  );
  let alphaPayload = select(
    f32(splatIndex),
    SOURCE_FRONTIER_ALPHA_CLASS_MASK_SENTINEL - f32(candidateSourceClassMask),
    candidateSourceClassMask != 0u
  );
  alphaParams[refIndex] = vec4f(sourceOpacity, centerPx.x, centerPx.y, alphaPayload);
  alphaParams[refIndex + materializeParams.maxTileRefs] = vec4f(inverseConic, 0.0);
}
