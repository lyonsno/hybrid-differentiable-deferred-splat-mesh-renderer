import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildWitnessTraceBundle, renderWitnessTraceBundleReport } from "../../scripts/visual-smoke/witness-trace-bundle.mjs";

test("visual smoke CLI exposes a witness trace bundle mode with explicit placeholder fields", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--trace-bundle/);
  assert.match(source, /runWitnessTraceBundle/);
  assert.match(source, /renderWitnessTraceBundleReport/);
  assert.match(source, /buildWitnessTraceBundle/);
  assert.match(source, /anchorPixels/);
  assert.match(source, /crops/);
  assert.match(source, /traceJson/);
  assert.match(source, /passFailNotes/);
  assert.match(source, /retention/i);
  assert.match(source, /ordering/i);
  assert.match(source, /finalAccumulation/i);
});

test("witness trace bundle keeps schema/projection/synthetic sections present and the remaining lanes explicit as missing", () => {
  const bundle = buildWitnessTraceBundle({
    witness: {
      generatedAt: "2026-05-14T12:34:56.000Z",
      baseUrl: "http://127.0.0.1:61625/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close",
      options: { viewport: { width: 3456, height: 1916 } },
      classification: {
        summary: { text: "PASS: static dessert final color and debug witnesses share one asset, viewport, and tile grid." },
        findings: [],
        closeable: true,
      },
      captures: [
        {
          id: "final-color",
          title: "Final color tile-local visible compositor",
          screenshotPath: "final-color.png",
          pageEvidence: {
            rendererLabel: "tile-local-visible",
            assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
            splatCount: 94406,
            tileLocal: { refs: 24000 },
          },
          classification: { nonblank: true, realSplatEvidence: true, summary: { text: "PASS" } },
        },
      ],
    },
    appRoot: process.cwd(),
    packetPath: "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
    thesisPath: "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md",
  });

  assert.equal(bundle.anchorPixels.length, 3);
  assert.equal(bundle.traceJson.schema.status, "present");
  assert.equal(bundle.traceJson.projection.status, "present");
  assert.equal(bundle.traceJson.syntheticParity.status, "present");
  assert.equal(bundle.traceJson.retention.status, "missing");
  assert.equal(bundle.traceJson.ordering.status, "missing");
  assert.equal(bundle.traceJson.finalAccumulation.status, "missing");
  assert.equal(bundle.passFailNotes.some((note) => note.startsWith("PASS:")), true);

  const report = renderWitnessTraceBundleReport(bundle);
  assert.match(report, /PROVISIONAL/);
  assert.match(report, /missing retention/);
  assert.match(report, /black-band-dropout-2300-1055/);
});
