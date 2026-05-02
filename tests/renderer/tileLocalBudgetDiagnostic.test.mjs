import assert from "node:assert/strict";
import test from "node:test";

import { buildTileLocalPrepassBridge } from "../../src/tileLocalPrepassBridge.js";

const identityViewProj = new Float32Array([
  1, 0, 0, 0,
  0, 1, 0, 0,
  0, 0, 1, 0,
  0, 0, 0, 1,
]);

test("tile-local prepass exposes budget overflow reasons and retained/dropped bands", () => {
  const count = 9;
  const positions = new Float32Array(count * 3);
  const scales = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  const opacities = new Float32Array(count);
  const originalIds = new Uint32Array(count);

  for (let index = 0; index < count; index += 1) {
    positions.set([0, 0, 0.2 + index * 0.04], index * 3);
    scales.set([Math.log(0.28), Math.log(0.28), 0], index * 3);
    colors.set(index % 3 === 0 ? [4, 3, 2] : [0.25, 0.25, 0.25], index * 3);
    opacities[index] = index >= 6 ? 0.9 : 0.25;
    originalIds[index] = 1000 + index;
  }

  const bridge = buildTileLocalPrepassBridge({
    attributes: { count, positions, scales, colors, opacities, originalIds },
    viewMatrix: identityViewProj,
    viewProj: identityViewProj,
    viewportWidth: 64,
    viewportHeight: 64,
    tileSizePx: 64,
    samplesPerAxis: 1,
    splatScale: 80,
    minRadiusPx: 1,
    maxRefsPerTile: 4,
  });

  assert.equal(bridge.budgetDiagnostics.version, 1);
  assert.equal(bridge.budgetDiagnostics.arenaRefs.projected, bridge.tileRefCustody.projectedTileEntryCount);
  assert.equal(bridge.budgetDiagnostics.arenaRefs.retained, bridge.tileRefCustody.retainedTileEntryCount);
  assert.equal(bridge.budgetDiagnostics.arenaRefs.dropped, bridge.tileRefCustody.evictedTileEntryCount);
  assert.equal(bridge.budgetDiagnostics.overflowReasons[0].reason, "per-tile-ref-cap");
  assert.equal(bridge.budgetDiagnostics.overflowReasons[0].droppedRefs > 0, true);
  assert.equal(bridge.budgetDiagnostics.retainedBands.front.total > 0, true);
  assert.equal(bridge.budgetDiagnostics.droppedBands.front.total > 0, true);
  assert.equal(bridge.budgetDiagnostics.heat.cpu.projectedRefs, bridge.tileRefCustody.projectedTileEntryCount);
  assert.equal(bridge.budgetDiagnostics.heat.gpu.retainedRefs, bridge.tileRefCustody.retainedTileEntryCount);
});
