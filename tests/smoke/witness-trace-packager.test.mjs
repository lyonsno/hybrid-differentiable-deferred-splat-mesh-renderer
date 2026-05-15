import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import { buildWitnessTraceBundle, renderWitnessTraceBundleReport } from "../../scripts/visual-smoke/witness-trace-bundle.mjs";

test("visual smoke CLI exposes a witness trace bundle mode with explicit landed section refs", () => {
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

test("witness trace bundle keeps schema/projection/synthetic sections present and refreshes the landed lanes with exact refs", () => {
  const bundle = buildWitnessTraceBundle({
    witness: {
      generatedAt: "2026-05-14T12:34:56.000Z",
      baseUrl: "http://127.0.0.1:61625/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close",
      options: { viewport: { width: 3456, height: 1916 } },
      classification: {
        summary: { text: "FAIL: Static dessert witness did not report crop-local rim source support." },
        findings: [],
        closeable: false,
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
  assert.equal(bundle.traceJson.retention.status, "present");
  assert.equal(bundle.traceJson.retention.source.ref, "origin/cc/retention-pixel-trace-0514@79cb725fb7ec55c1fb8f2c22276e58945b0a8744");
  assert.equal(bundle.traceJson.ordering.status, "present");
  assert.equal(bundle.traceJson.ordering.source.ref, "origin/cc/ordering-band-row-trace-0514@13cfcca");
  assert.equal(bundle.traceJson.finalAccumulation.status, "present");
  assert.equal(bundle.traceJson.finalAccumulation.source.ref, "origin/cc/final-accumulation-trace-0515@f5f0fbb7689dac0cc3ef997f0e3cdb4ccf0d2cd5");
  assert.equal(bundle.passFailNotes.some((note) => note.startsWith("FAIL:")), true);

  const report = renderWitnessTraceBundleReport(bundle);
  assert.match(report, /FAIL/);
  assert.match(report, /retention: landed report def83a63/);
  assert.match(report, /ordering: landed report 8176bf3f/);
  assert.match(report, /finalAccumulation: landed report db4c263e/);
  assert.match(report, /black-band-dropout-2300-1055/);
});
