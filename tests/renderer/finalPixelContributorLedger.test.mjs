import assert from "node:assert/strict";
import test from "node:test";

import { buildFinalPixelContributorLedger } from "../../src/rendererFidelityProbes/finalPixelContributorLedger.js";

test("final pixel contributor ledger names per-pixel missing fields instead of promoting frame counters", () => {
  const ledger = buildFinalPixelContributorLedger({
    witness: lacunarWitnessAnalysis(),
    pixels: [
      {
        id: "lacunar-hole-dessert-1260-930",
        class: "lacunar-hole",
        pixel: { x: 1260, y: 930 },
        crop: { x: 1232, y: 902, width: 80, height: 80 },
        supportRegion: "porousBody",
      },
      {
        id: "dense-foreground-leak-1580-1260",
        class: "dense-foreground-leak",
        pixel: { x: 1580, y: 1260 },
        crop: { x: 1540, y: 1220, width: 96, height: 96 },
        supportRegion: "rimBand",
      },
      {
        id: "black-band-dropout-2300-1055",
        class: "black-band-dropout",
        pixel: { x: 2300, y: 1055 },
        crop: { x: 2232, y: 1024, width: 160, height: 48 },
      },
    ],
  });

  assert.equal(ledger.version, 1);
  assert.deepEqual(
    ledger.pixels.map((entry) => entry.id),
    [
      "lacunar-hole-dessert-1260-930",
      "dense-foreground-leak-1580-1260",
      "black-band-dropout-2300-1055",
    ],
  );
  assert.deepEqual(ledger.pixelClasses, ["black-band-dropout", "dense-foreground-leak", "lacunar-hole"]);

  const lacunarHole = ledger.pixels[0];
  assert.equal(lacunarHole.evidence.projected.status, "present");
  assert.equal(lacunarHole.evidence.projected.field, "witness.projection.cropSupport.porousBody.projectedSupportCount");
  assert.equal(lacunarHole.evidence.projected.count, 2759);
  assert.equal(lacunarHole.evidence.retained.status, "missing-diagnostic-field");
  assert.equal(lacunarHole.evidence.retained.missingField, "tileLocal.perPixelRetainedContributors");
  assert.equal(lacunarHole.evidence.ordered.missingField, "tileLocal.perPixelOrderedContributors");
  assert.equal(lacunarHole.evidence.finalColorAccumulation.missingField, "tileLocal.perPixelFinalColorAccumulation");
  assert.equal(lacunarHole.context.frameRetainedRefs, 2360150);
  assert.equal(lacunarHole.context.orderingBackend, "gpu-sorted-index-rank-inversion");

  const denseLeak = ledger.pixels[1];
  assert.equal(denseLeak.evidence.projected.field, "witness.projection.cropSupport.rimBand.projectedSupportCount");
  assert.equal(denseLeak.evidence.projected.count, 5071);

  const blackBand = ledger.pixels[2];
  assert.equal(blackBand.evidence.projected.status, "missing-diagnostic-field");
  assert.equal(blackBand.evidence.projected.missingField, "tileLocal.perPixelProjectedContributors");
  assert.equal(blackBand.context.debugModes.join(","), "coverage-weight,accumulated-alpha,transmittance,tile-ref-count,conic-shape");

  assert.deepEqual(ledger.missingDiagnosticFields, [
    "tileLocal.perPixelFinalColorAccumulation",
    "tileLocal.perPixelOrderedContributors",
    "tileLocal.perPixelProjectedContributors",
    "tileLocal.perPixelRetainedContributors",
  ]);
});

function lacunarWitnessAnalysis() {
  return {
    baseUrl:
      "http://127.0.0.1:61623/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible",
    captures: [
      capture("final-color", {
        rendererLabel: "tile-local-visible-gaussian-compositor",
        debugMode: "final-color",
        witness: {
          projection: {
            cropSupport: {
              porousBody: { projectedSupportCount: 2759 },
              rimBand: { projectedSupportCount: 5071 },
            },
          },
        },
        tileLocal: {
          refs: 2360150,
          orderingBackend: "gpu-sorted-index-rank-inversion",
          visibleCompositedRefLimit: 256,
          budgetDiagnostics: {
            arenaRefs: {
              projected: 2360150,
              retained: 2360150,
              dropped: 0,
            },
          },
        },
      }),
      capture("coverage-weight", { debugMode: "coverage-weight" }),
      capture("accumulated-alpha", { debugMode: "accumulated-alpha" }),
      capture("transmittance", { debugMode: "transmittance" }),
      capture("tile-ref-count", { debugMode: "tile-ref-count" }),
      capture("conic-shape", { debugMode: "conic-shape" }),
    ],
  };
}

function capture(id, pageEvidence = {}) {
  return {
    id,
    pageEvidence,
    classification: {
      harnessPassed: true,
      realSplatEvidence: true,
    },
  };
}
