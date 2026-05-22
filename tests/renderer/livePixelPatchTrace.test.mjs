import assert from "node:assert/strict";
import test from "node:test";

import {
  buildLivePixelPatchTraceEvidence,
  classifyLivePixelPatchTrace,
} from "../../src/rendererFidelityProbes/livePixelPatchTrace.js";

test("live pixel patch trace records same-observation hole, rim, and sealed-neighbor rows with red-check context", () => {
  const trace = buildLivePixelPatchTraceEvidence({
    url: "http://127.0.0.1:54317/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&renderer=tile-local-visible&arenaBackend=gpu&tileSizePx=16&maxRefsPerTile=256",
    branch: "cc/live-pixel-patch-proctoscopy-0522",
    commit: "4a324ac",
    viewport: { width: 1280, height: 720 },
    pageEvidence: {
      rendererLabel: "tile-local-visible-gaussian-compositor",
      arenaRuntime: {
        requestedArenaBackend: "gpu",
        effectiveArenaBackend: "gpu",
      },
      canvas: {
        width: 1280,
        height: 720,
        clientWidth: 1280,
        clientHeight: 720,
        format: "rgba8unorm",
        alphaMode: "premultiplied",
        colorSpace: "srgb",
      },
      tileLocalStatus: "active",
      tileLocalLastSkipReason: null,
      tileLocal: {
        debugMode: "final-color",
        orderingBackend: "gpu-bitonic-cpu-depth-keys",
        visibleCompositedRefLimit: 256,
        budget: { tileSizePx: 16, maxRefsPerTile: 256 },
        freshness: {
          clearFrameId: 17,
          buildFrameId: 18,
          compositeFrameId: 19,
          cacheState: "fresh",
        },
        outputTextureReadback: {
          status: "present",
          format: "rgba16float",
          frameId: 19,
          width: 1280,
          height: 720,
          anchors: [
            { id: "porous-hole", pixel: { x: 640, y: 360 }, outputTextureRgba8: [22, 18, 15, 255] },
            { id: "porous-sealed-neighbor", pixel: { x: 644, y: 360 }, outputTextureRgba8: [180, 112, 70, 255] },
            { id: "rim-edge", pixel: { x: 300, y: 512 }, outputTextureRgba8: [132, 91, 72, 255] },
          ],
        },
        compositorInputReadback: {
          status: "present",
          frameId: 19,
          anchors: [
            liveAnchor("porous-hole", "porous-body-hole", 640, 360, 40, 22, 0.000002, [22, 18, 15, 255]),
            liveAnchor("porous-sealed-neighbor", "sealed-neighbor", 644, 360, 40, 22, 0.71, [180, 112, 70, 255]),
            liveAnchor("rim-edge", "plate-rim-edge", 300, 512, 18, 33, 0.38, [132, 91, 72, 255]),
          ],
        },
      },
    },
    sampledCanvasByAnchorId: new Map([
      ["porous-hole", [22, 18, 15, 255]],
      ["porous-sealed-neighbor", [180, 112, 70, 255]],
      ["rim-edge", [132, 91, 72, 255]],
    ]),
    cropPointers: [
      {
        id: "porous-body-crop",
        path: "smoke-reports/live-pixel-patch-proctoscopy/porous-body-crop.png",
        anchors: ["porous-hole", "porous-sealed-neighbor"],
      },
    ],
  });

  assert.equal(trace.comparisonClass, "same-observation-live-pixel-patch");
  assert.equal(trace.routeIdentity.asset, "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");
  assert.equal(trace.routeIdentity.witnessView, "dessert-porous-close");
  assert.equal(trace.routeIdentity.requestedRenderer, "tile-local-visible");
  assert.equal(trace.routeIdentity.effectiveRenderer, "tile-local-visible-gaussian-compositor");
  assert.equal(trace.routeIdentity.requestedArenaBackend, "gpu");
  assert.equal(trace.routeIdentity.effectiveArenaBackend, "gpu");
  assert.equal(trace.routeIdentity.tileSizePx, 16);
  assert.equal(trace.routeIdentity.maxRefsPerTile, 256);
  assert.equal(trace.routeIdentity.frameId, 19);

  assert.deepEqual(trace.patchRoles, {
    porousBodyHole: ["porous-hole"],
    plateRimEdge: ["rim-edge"],
    sealedNeighbors: ["porous-sealed-neighbor"],
  });
  assert.equal(trace.records.length, 3);

  const hole = trace.records.find((record) => record.id === "porous-hole");
  assert.equal(hole.pixel.x, 640);
  assert.deepEqual(hole.tileAddress.neighborTileIndices.sort((a, b) => a - b), [1719, 1720, 1721, 1799, 1800, 1801, 1879, 1880, 1881]);
  assert.equal(hole.tileHeader.retainedContributorCount, 2);
  assert.equal(hole.tileHeader.projectedContributorCount, 12);
  assert.equal(hole.presentationFreshness.cacheState, "fresh");
  assert.equal(hole.outputCanvas.outputTextureFormat, "rgba16float");
  assert.deepEqual(hole.outputCanvas.liveCompositorInputRgba8, [22, 18, 15, 255]);
  assert.deepEqual(hole.outputCanvas.sampledCanvasRgba8, [22, 18, 15, 255]);
  assert.equal(hole.deferredGuardrail.status, "loud-null");
  assert.match(hole.deferredGuardrail.missingReason, /deferred G-buffer/);

  const firstContributor = hole.contributors[0];
  assert.deepEqual(firstContributor.centerPx, [640.5, 360.5]);
  assert.deepEqual(firstContributor.inverseConic, [0.33, 0.02, 0.41]);
  assert.equal(firstContributor.coverageWeight, 0.88);
  assert.equal(firstContributor.tileCoverageWeight, 0.88);
  assert.equal(firstContributor.pixelCoverageWeight, 0.000002);
  assert.equal(firstContributor.sourceOpacity, 0.72);
  assert.equal(firstContributor.coverageAlpha, 0.000003);
  assert.equal(firstContributor.transmittanceBefore, 1);
  assert.equal(firstContributor.transmittanceAfter, 0.999997);
  assert.deepEqual(firstContributor.sourceColor, [0.73, 0.45, 0.28]);
  assert.deepEqual(firstContributor.runningColor, [0.020002, 0.020001, 0.040001]);

  assert.equal(trace.redCheck.status, "screen-space-sampling-underfill");
  assert.equal(trace.redCheck.holeAnchorId, "porous-hole");
  assert.equal(trace.redCheck.matchedSealedNeighborId, "porous-sealed-neighbor");
  assert.equal(trace.redCheck.context.cropPointers[0].id, "porous-body-crop");

  const verdict = classifyLivePixelPatchTrace(trace);
  assert.equal(verdict.status, "screen-space-sampling-underfill");
  assert.equal(verdict.severity, "blocked");
});

function liveAnchor(id, kind, x, y, tileX, tileY, pixelCoverageWeight, rgba8) {
  const tileIndex = tileY * 80 + tileX;
  return {
    id,
    kind,
    pixel: { x, y },
    tileAddress: {
      tileX,
      tileY,
      tileIndex,
      localX: x - tileX * 16,
      localY: y - tileY * 16,
    },
    header: {
      firstRefIndex: tileIndex * 2,
      refCount: 2,
      projectedCount: 12,
      droppedCount: 10,
    },
    gpuScatterCount: 12,
    tileCapacity: 256,
    refLimit: 2,
    liveCompositorRgba: rgba8.map((channel) => channel / 255),
    liveCompositorRgba8: rgba8,
    remainingTransmission: 1 - Math.min(pixelCoverageWeight, 0.999),
    contributors: [
      {
        layer: 0,
        refIndex: tileIndex * 2,
        splatIndex: 101,
        originalId: 9001,
        alphaParamIndex: tileIndex * 2,
        centerPx: [640.5, 360.5],
        inverseConic: [0.33, 0.02, 0.41],
        coverageWeight: 0.88,
        tileCoverageWeight: 0.88,
        pixelCoverageWeight,
        sourceOpacity: 0.72,
        coverageAlpha: Math.min(0.999, pixelCoverageWeight * 1.5),
        transmittanceBefore: 1,
        transmittanceAfter: 1 - Math.min(0.999, pixelCoverageWeight * 1.5),
        sourceColor: [0.73, 0.45, 0.28],
        runningColor: id === "porous-hole" ? [0.020002, 0.020001, 0.040001] : [0.46, 0.29, 0.19],
        status: "accumulated",
      },
    ],
  };
}
