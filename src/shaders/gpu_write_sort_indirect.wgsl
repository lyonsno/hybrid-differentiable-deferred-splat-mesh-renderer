// Write indirect dispatch args for radix sort and reorder passes
// based on actual tile-ref count from the scatter pass.
//
// Reads counters[1] (total refs written by scatter).
// Writes dispatch args so sort/reorder process only actual data.
//
// Dispatch: (1, 1, 1) — single invocation.

// Radix sort: workgroup size 256, items per thread 4 → 1024 elements per workgroup
const RADIX_ELEMENTS_PER_WG = 1024u;
// Reorder: workgroup size 256
const REORDER_WG_SIZE = 256u;
// Radix init: workgroup size 256
const INIT_WG_SIZE = 256u;

@group(0) @binding(0) var<storage, read> counters: array<u32>;
// indirectArgs layout:
//   [0..2]  = radix sort workgroups (x, 1, 1)
//   [3..5]  = reorder workgroups (x, 1, 1)
//   [6..8]  = radix init workgroups (x, 1, 1)
//   [9]     = actual ref count (for CPU readback / diagnostics)
@group(0) @binding(1) var<storage, read_write> indirectArgs: array<u32>;
@group(0) @binding(2) var<uniform> maxElements: u32;

@compute @workgroup_size(1)
fn main() {
  // counters[1] = total refs written; use maxElements as cap
  let actualRefs = min(counters[1], maxElements);

  let radixWGs = (actualRefs + RADIX_ELEMENTS_PER_WG - 1u) / RADIX_ELEMENTS_PER_WG;
  indirectArgs[0] = max(radixWGs, 1u);
  indirectArgs[1] = 1u;
  indirectArgs[2] = 1u;

  let reorderWGs = (actualRefs + REORDER_WG_SIZE - 1u) / REORDER_WG_SIZE;
  indirectArgs[3] = max(reorderWGs, 1u);
  indirectArgs[4] = 1u;
  indirectArgs[5] = 1u;

  let initWGs = (maxElements + INIT_WG_SIZE - 1u) / INIT_WG_SIZE;
  indirectArgs[6] = initWGs;
  indirectArgs[7] = 1u;
  indirectArgs[8] = 1u;

  indirectArgs[9] = actualRefs;
}
