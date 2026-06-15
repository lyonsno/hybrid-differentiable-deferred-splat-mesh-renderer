// Tile classification: scan tiles, build small/large tile lists.
// Single workgroup (256 threads), each thread processes multiple tiles.
//
// Small tiles (≤4096 entries) → smallTileList for bitonic sort.
// Large tiles (>4096 entries) → largeTileList for bucket pre-sort.
// Also allocates overflow scratch offsets for large tiles.
//
// Dispatch: (1, 1, 1) — single workgroup.

const CLASSIFY_WG = 256u;
const MAX_TILE_ENTRIES = 4096u;

struct ClassifyParams {
  numTilesX: u32,
  numTilesY: u32,
  mortonTileCount: u32,
  maxTotalEntries: u32,
};

@group(0) @binding(0) var<uniform> params: ClassifyParams;
@group(0) @binding(1) var<storage, read> tileCounts: array<u32>;
@group(0) @binding(2) var<storage, read_write> smallTileList: array<u32>;
@group(0) @binding(3) var<storage, read_write> largeTileList: array<u32>;
@group(0) @binding(4) var<storage, read_write> tileListCounts: array<atomic<u32>>;
// tileListCounts[0] = small count, [1] = large count, [2] = total overflow entries
@group(0) @binding(5) var<storage, read_write> largeTileOverflowBases: array<u32>;
// Indirect dispatch args: [0..2] = small sort, [3..5] = bucket sort
@group(0) @binding(6) var<storage, read_write> indirectDispatchArgs: array<u32>;

fn mortonEncode2D(x: u32, y: u32) -> u32 {
  var mx = x & 0xFFFFu;
  mx = (mx | (mx << 8u)) & 0x00FF00FFu;
  mx = (mx | (mx << 4u)) & 0x0F0F0F0Fu;
  mx = (mx | (mx << 2u)) & 0x33333333u;
  mx = (mx | (mx << 1u)) & 0x55555555u;
  var my = y & 0xFFFFu;
  my = (my | (my << 8u)) & 0x00FF00FFu;
  my = (my | (my << 4u)) & 0x0F0F0F0Fu;
  my = (my | (my << 2u)) & 0x33333333u;
  my = (my | (my << 1u)) & 0x55555555u;
  return mx | (my << 1u);
}

@compute @workgroup_size(256)
fn classify_tiles(@builtin(local_invocation_index) localIdx: u32) {
  let numTiles = params.numTilesX * params.numTilesY;

  for (var linearIdx = localIdx; linearIdx < numTiles; linearIdx += CLASSIFY_WG) {
    let tileX = linearIdx % params.numTilesX;
    let tileY = linearIdx / params.numTilesX;
    let mortonId = mortonEncode2D(tileX, tileY);

    if (mortonId >= params.mortonTileCount) { continue; }

    let count = tileCounts[mortonId];
    if (count == 0u) { continue; }

    if (count <= MAX_TILE_ENTRIES) {
      let sIdx = atomicAdd(&tileListCounts[0], 1u);
      smallTileList[sIdx] = mortonId;
    } else {
      let overflowOffset = atomicAdd(&tileListCounts[2], count);
      let lIdx = atomicAdd(&tileListCounts[1], 1u);
      largeTileList[lIdx] = mortonId;
      largeTileOverflowBases[lIdx] = params.maxTotalEntries + overflowOffset;
    }
  }

  workgroupBarrier();

  // Thread 0 writes indirect dispatch args
  if (localIdx == 0u) {
    let smallCount = atomicLoad(&tileListCounts[0]);
    let largeCount = atomicLoad(&tileListCounts[1]);

    // Small tile sort: (smallCount, 1, 1)
    indirectDispatchArgs[0] = smallCount;
    indirectDispatchArgs[1] = 1u;
    indirectDispatchArgs[2] = 1u;

    // Bucket sort: (largeCount, 1, 1)
    indirectDispatchArgs[3] = largeCount;
    indirectDispatchArgs[4] = 1u;
    indirectDispatchArgs[5] = 1u;
  }
}
