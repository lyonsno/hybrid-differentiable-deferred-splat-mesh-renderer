struct ArenaHeader {
  firstRecord: u32,
  recordCount: u32,
  projectedCount: u32,
  overflowFlags: u32,
};

struct ContributorRecord {
  splatId: u32,
  orderingKey: u32,
  alphaParamIndex: u32,
  flags: u32,
  coverageAndDepth: vec4f,
  conicAndOpacity: vec4f,
  reserved0: vec4u,
};

@group(0) @binding(0) var<storage, read_write> arenaHeaders: array<ArenaHeader>;
@group(0) @binding(1) var<storage, read_write> prefixCounts: array<u32>;
@group(0) @binding(2) var<storage, read_write> contributorRecords: array<ContributorRecord>;

@compute @workgroup_size(64) fn clear_contributor_arena(@builtin(global_invocation_id) globalId: vec3u) {
  let tileId = globalId.x;
  if (tileId >= arrayLength(&arenaHeaders)) {
    return;
  }
  arenaHeaders[tileId] = ArenaHeader(0u, 0u, 0u, 0u);
  prefixCounts[tileId] = 0u;
}

@compute @workgroup_size(64) fn count_tile_contributors(@builtin(global_invocation_id) globalId: vec3u) {
  _ = globalId;
  // TODO(contributor-arena-contract): consume the anchor-owned tile-local contributor predicate.
  // This stage is intentionally inert until the CPU reference builder and contract lane settle
  // projected coverage, depth/order, opacity/transmittance, and overflow semantics.
}

@compute @workgroup_size(64) fn prefix_tile_contributor_counts(@builtin(global_invocation_id) globalId: vec3u) {
  _ = globalId;
  // TODO(contributor-arena-contract): replace this placeholder with a parallel prefix pass.
  // The renderer does not route first smoke through this GPU arena while the prefix path is a skeleton.
}

@compute @workgroup_size(64) fn scatter_tile_contributors(@builtin(global_invocation_id) globalId: vec3u) {
  _ = globalId;
  // TODO(contributor-arena-contract): scatter contributor records after prefix offsets are available.
  // The record shape is a GPU carrier for the anchor contract, not a redefinition of that contract.
}
