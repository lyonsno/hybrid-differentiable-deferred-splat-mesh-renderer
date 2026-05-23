import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  OPERATOR_WITNESS_CAPTURE_IDS,
  buildOperatorWitnessLoopPlan,
  classifyOperatorWitnessLoop,
} from "../../scripts/visual-smoke/operator-witness-loop.mjs";

const BASE_URL =
  "http://127.0.0.1:5173/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu";

test("operator witness loop plan captures whole render before close crops and interaction frames", () => {
  const plan = buildOperatorWitnessLoopPlan(BASE_URL);

  assert.deepEqual(
    plan.map((capture) => [capture.id, capture.evidenceRole, capture.expectedRendererLabel]),
    [
      [OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, "operator-visual", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, "operator-visual", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.porousClose, "operator-visual", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, "operator-filmstrip", "tile-local-visible"],
      [OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, "operator-filmstrip", "tile-local-visible"],
    ]
  );
  assert.equal(plan[0].url, `${BASE_URL}&renderer=tile-local-visible`);
  assert.match(plan[1].url, /witnessView=dessert-close/);
  assert.match(plan[2].url, /witnessView=dessert-porous-close/);
  assert.ok(plan.every((capture) => capture.timeoutMs === 15000));
  assert.ok(plan.every((capture) => capture.timeoutCanvasClipMs === 1500));
  assert.ok(plan.every((capture) => capture.timeoutScreenshotMs === 2500));
  assert.deepEqual(plan[3].interactions, [{ type: "drag", button: "left", dx: -120, dy: 0 }]);
  assert.deepEqual(plan[4].interactions, [{ type: "drag", button: "left", dx: 120, dy: 0 }]);
});

test("operator witness loop plan keeps trace diagnostics out of the visual route", () => {
  const plan = buildOperatorWitnessLoopPlan(`${BASE_URL}&traceAnchors=fresh-a@120,140:lacunar-hole`);

  assert.ok(plan.every((capture) => !new URL(capture.url).searchParams.has("traceAnchors")));
  assert.ok(plan.every((capture) => !new URL(capture.url).searchParams.has("traceAnchor")));
  assert.ok(plan.every((capture) => !new URL(capture.url).searchParams.has("presentationAnchors")));
});

test("operator witness loop plan defaults to the current GPU tile-local smoke route", () => {
  const plan = buildOperatorWitnessLoopPlan("http://127.0.0.1:5173/");

  for (const capture of plan) {
    const params = new URL(capture.url).searchParams;
    assert.equal(params.get("asset"), "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");
    assert.equal(params.get("arenaBackend"), "gpu");
    assert.equal(params.get("tileSizePx"), "16");
    assert.equal(params.get("maxRefsPerTile"), "256");
    assert.equal(params.get("renderer"), "tile-local-visible");
  }
});

test("operator witness loop plan overrides stale CPU or old tile budget query params", () => {
  const plan = buildOperatorWitnessLoopPlan(
    "http://127.0.0.1:5173/?asset=/other.json&arenaBackend=cpu&tileSizePx=6&maxRefsPerTile=32"
  );

  for (const capture of plan) {
    const params = new URL(capture.url).searchParams;
    assert.equal(params.get("asset"), "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json");
    assert.equal(params.get("arenaBackend"), "gpu");
    assert.equal(params.get("tileSizePx"), "16");
    assert.equal(params.get("maxRefsPerTile"), "256");
  }
});

test("operator witness loop plan inherits caller timeout instead of enforcing a hidden cap", () => {
  const plan = buildOperatorWitnessLoopPlan(BASE_URL, { timeoutMs: 60000 });

  assert.ok(plan.every((capture) => capture.timeoutMs === 60000));
});

test("operator witness loop classifier requires all visual captures to be real nonblank Scaniverse evidence", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, { witnessView: "dessert-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.closeable, true);
  assert.equal(result.summary.status, "PASS");
  assert.equal(result.metrics.captureCount, 5);
  assert.equal(result.metrics.operatorVisualCaptures, 3);
  assert.equal(result.metrics.filmstripCaptures, 2);
  assert.equal(result.metrics.contactSheetPath, "smoke-reports/operator-witness/contact-sheet.png");
  assert.deepEqual(result.metrics.witnessViews, ["default", "dessert-close", "dessert-porous-close"]);
});

test("operator witness loop classifier fails when a visual frame times out or lacks real splat evidence", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
        realSplatEvidence: false,
        pageEvidence: { sourceKind: "", splatCount: 0, assetPath: "" },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { harnessPassed: false }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight),
    ],
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(
    result.findings.map((finding) => finding.kind),
    ["missing-real-splat-evidence", "capture-smoke-failed", "blank-capture", "missing-contact-sheet"]
  );
});

test("operator witness loop classifier preserves real Scaniverse evidence separately from timeout closure", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, {
        harnessPassed: false,
        realSplatEvidence: false,
        imageNonblank: true,
        pageEvidence: {
          sourceKind: "scaniverse_ply",
          splatCount: 94406,
          assetPath: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
        },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, { witnessView: "dessert-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(result.findings.map((finding) => finding.kind), ["capture-smoke-failed"]);
});

test("operator witness loop classifier rejects otherwise-valid captures on stale CPU or 6px routes", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, { arenaBackend: "cpu", tileSizePx: "6" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, { witnessView: "dessert-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.closeable, false);
  assert.deepEqual(
    result.findings.map((finding) => finding.kind),
    ["operator-route-fallback", "operator-route-fallback"]
  );
});

test("visual smoke CLI exposes an operator witness loop batch mode", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");

  assert.match(source, /--operator-witness-loop/);
  assert.match(source, /runOperatorWitnessLoop/);
  assert.match(source, /buildOperatorWitnessLoopPlan\(baseUrl, \{ timeoutMs: options\.timeoutMs \}\)/);
});

test("visual smoke CLI routes both initial and post-interaction readiness timeouts into reports", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const initialWait = source.indexOf("await waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs);");
  const interactionWait = source.indexOf(
    "await waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs);",
    initialWait + 1
  );
  const catchStart = source.indexOf("} catch (error) {", initialWait);
  const routedFailure = source.indexOf("captureTimeoutFailureWithRoute", catchStart);

  assert.ok(initialWait > 0);
  assert.ok(interactionWait > initialWait);
  assert.ok(catchStart > interactionWait);
  assert.ok(routedFailure > catchStart);
});

function witnessCapture(
  id,
  {
    harnessPassed = true,
    realSplatEvidence = true,
    sourceKind = "scaniverse_ply",
    witnessView = "default",
    pageEvidence,
    imageNonblank = harnessPassed,
    assetPath = "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    arenaBackend = "gpu",
    tileSizePx = "16",
    maxRefsPerTile = "256",
  } = {}
) {
  const realPageEvidence = pageEvidence ?? {
    sourceKind,
    assetPath,
    rendererLabel: "tile-local-visible-gaussian-compositor",
    canvas: { width: 1280, height: 720 },
    tileLocal: { refs: 94406, tileColumns: 80, tileRows: 45 },
    splatCount: 94406,
  };
  return {
    id,
    title: id,
    evidenceRole: id.includes("orbit") ? "operator-filmstrip" : "operator-visual",
    screenshotPath: `smoke-reports/operator-witness/${id}.png`,
    classification: {
      harnessPassed,
      realSplatEvidence,
      nonblank: harnessPassed,
      sourceKind,
    },
    imageAnalysis: {
      nonblank: imageNonblank,
      changedPixelRatio: imageNonblank ? 0.12 : 0,
      width: 1280,
      height: 720,
    },
    pageEvidence: realPageEvidence,
    routeIdentity: {
      witnessView,
      renderer: "tile-local-visible",
      assetPath,
      arenaBackend,
      tileSizePx,
      maxRefsPerTile,
      traceAnchors: null,
      presentationAnchors: null,
    },
  };
}
