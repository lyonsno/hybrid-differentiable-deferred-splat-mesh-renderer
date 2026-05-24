import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

import {
  OPERATOR_WITNESS_CAPTURE_IDS,
  buildOperatorWitnessLoopPlan,
  classifyOperatorWitnessLoop,
  summarizeOperatorWitnessTiming,
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
  assert.deepEqual(
    plan.map((capture) => capture.witnessView),
    ["default", "dessert-close", "dessert-porous-close", "dessert-porous-close", "dessert-porous-close"]
  );
  assert.ok(plan.every((capture) => capture.timeoutMs === 15000));
  assert.ok(plan.every((capture) => capture.timeoutCanvasClipMs === 1500));
  assert.ok(plan.every((capture) => capture.timeoutScreenshotMs === 15000));
  assert.deepEqual(plan[3].interactions, [{ type: "drag", button: "left", dx: -120, dy: 0 }]);
  assert.deepEqual(plan[4].interactions, [{ type: "drag", button: "left", dx: 120, dy: 0 }]);
});

test("operator witness loop plan keeps one canonical page route for warmed captures", () => {
  const plan = buildOperatorWitnessLoopPlan(BASE_URL);

  assert.deepEqual(
    [...new Set(plan.map((capture) => capture.url))],
    [`${BASE_URL}&renderer=tile-local-visible`]
  );
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
  assert.ok(plan.every((capture) => capture.timeoutScreenshotMs === 60000));
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

test("operator witness loop classifier summarizes capture timing bottlenecks", () => {
  const result = classifyOperatorWitnessLoop({
    captures: [
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.wholeRender, {
        timing: {
          totalMs: 1200,
          stages: [
            { name: "apply-view", elapsedMs: 40 },
            { name: "readiness", elapsedMs: 900 },
            { name: "screenshot", elapsedMs: 260 },
          ],
        },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
        witnessView: "dessert-close",
        timing: {
          totalMs: 1800,
          stages: [
            { name: "apply-view", elapsedMs: 60 },
            { name: "readiness", elapsedMs: 1600 },
            { name: "screenshot", elapsedMs: 140 },
          ],
        },
      }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousClose, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft, { witnessView: "dessert-porous-close" }),
      witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight, { witnessView: "dessert-porous-close" }),
    ],
    contactSheetPath: "smoke-reports/operator-witness/contact-sheet.png",
  });

  assert.equal(result.metrics.timing.totalCaptureMs, 3000);
  assert.deepEqual(result.metrics.timing.slowestCapture, {
    id: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    totalMs: 1800,
  });
  assert.deepEqual(result.metrics.timing.slowestStage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    name: "readiness",
    elapsedMs: 1600,
  });
});

test("operator witness timing summary preserves app-side frame stage attribution", () => {
  const timing = summarizeOperatorWitnessTiming([
    witnessCapture(OPERATOR_WITNESS_CAPTURE_IDS.dessertClose, {
      timing: {
        totalMs: 1800,
        stages: [{ name: "view-readiness", elapsedMs: 1600 }],
      },
      pageEvidence: {
        operatorWitness: {
          frameSerial: 7,
          frameTimings: {
            totalMs: 1420,
            stages: [
              { name: "alpha-density", elapsedMs: 20 },
              { name: "tile-local-scene-state", elapsedMs: 1310 },
              { name: "evidence-exposure", elapsedMs: 90 },
            ],
          },
        },
      },
    }),
  ]);

  assert.deepEqual(timing.slowestAppFrameStage, {
    captureId: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
    name: "tile-local-scene-state",
    elapsedMs: 1310,
    frameSerial: 7,
  });
});

test("operator witness report prints the slowest app-side frame stage", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const reportStart = source.indexOf("function renderOperatorWitnessLoopReport");
  const reportEnd = source.indexOf("function renderOperatorTimingTable", reportStart);
  const reportSource = source.slice(reportStart, reportEnd);

  assert.match(reportSource, /Slowest app frame stage:/);
  assert.match(reportSource, /timing\.slowestAppFrameStage/);
});

test("operator witness app frame timing splits compact retained source construction", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const ensureStart = source.indexOf("function ensureTileLocalSceneState");
  const ensureEnd = source.indexOf("function captureCurrentTileLocalSignature", ensureStart);
  const ensureSource = source.slice(ensureStart, ensureEnd);
  const gpuStart = source.indexOf("function createGpuArenaTileLocalSceneState");
  const gpuEnd = source.indexOf("function buildCompactRetainedSourceForRuntime", gpuStart);
  const gpuSource = source.slice(gpuStart, gpuEnd);

  assert.match(ensureSource, /footprintParams,\s*frameTiming/);
  assert.match(gpuSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-retained-source"/);
  assert.match(gpuSource, /timeOptionalFrameStage\(frameTiming,\s*"gpu-arena-runtime"/);
});

test("operator witness compact source timing exposes internal construction stages", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const compactSourceStart = source.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = source.indexOf("function estimateCompactProjectedTileRefCount", compactSourceStart);
  const compactSource = source.slice(compactSourceStart, compactSourceEnd);

  assert.match(compactSource, /presentationScope,\s*frameTiming,\s*}:/);
  assert.match(compactSource, /rendererMetadata,\s*frameTiming,\s*}:/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-project-splats"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-estimate-ref-budget"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-stream-retention"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-finalize-retained"/);
  assert.match(compactSource, /timeOptionalFrameStage\(frameTiming,\s*"compact-source-pixel-traces"/);
});

test("compact stream retention hot path avoids duplicate key scans", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const retainStart = source.indexOf("function compactRetainTopRecord");
  const retainEnd = source.indexOf("function compactMergedTileCandidateRecords", retainStart);
  const retainSource = source.slice(retainStart, retainEnd);

  assert.doesNotMatch(retainSource, /records\.some/);
  assert.doesNotMatch(retainSource, /compactProjectionRetentionRecordKey/);
});

test("compact stream retention caches capped-list worst records", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const bucketStart = source.indexOf("interface CompactStreamingTileBucket");
  const mergeEnd = source.indexOf("function streamCompactProjectedTileRefs", bucketStart);
  const retentionSource = source.slice(bucketStart, mergeEnd);

  assert.match(retentionSource, /interface CompactRetainedRecordList/);
  assert.match(retentionSource, /worstIndex:\s*number/);
  assert.match(retentionSource, /function compactRetainedRecordListWorstIndex/);
  assert.match(retentionSource, /compactRetainTopRecord\(\s*recordList:\s*CompactRetainedRecordList/);
  assert.match(retentionSource, /compareRecords\(record,\s*records\[recordList\.worstIndex\]\)\s*>=\s*0/);
});

test("compact stream retention avoids dense tile-x range allocation", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const streamStart = source.indexOf("function streamCompactProjectedTileRefs");
  const streamEnd = source.indexOf("function compactSourceBoundedTileRefCount", streamStart);
  const streamSource = source.slice(streamStart, streamEnd);

  assert.match(streamSource, /function compactStreamDenseTileXRange/);
  assert.match(streamSource, /for\s*\(\s*let tileX = minTileX;\s*tileX <= maxTileX;\s*tileX \+= 1\s*\)/);
  assert.doesNotMatch(streamSource, /compactSourceTileXRange\(minTileX,\s*maxTileX\)/);
});

test("compact stream retention precomputes covariance density parameters", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const streamStart = source.indexOf("function streamCompactProjectedTileRefs");
  const streamEnd = source.indexOf("function compactSourceBoundedTileRefCount", streamStart);
  const streamSource = source.slice(streamStart, streamEnd);
  const densityStart = source.indexOf("\nfunction compactSourceCovarianceDensity(");
  const clampStart = source.indexOf("function compactClamp", densityStart);
  const densitySource = source.slice(densityStart, clampStart);

  assert.match(streamSource, /const densityParams = compactSourceCovarianceDensityParams\(covariance\)/);
  assert.match(streamSource, /densityParams,/);
  assert.match(densitySource, /densityParams:\s*CompactSourceCovarianceDensityParams/);
  assert.doesNotMatch(densitySource, /covariance\.yy\s*\/\s*covariance\.determinant/);
  assert.doesNotMatch(densitySource, /Math\.sqrt\(covariance\.determinant\)/);
});

test("compact finalize retention reuses bounded priority candidate lists", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const compactSourceStart = source.indexOf("function buildCompactRetainedSourceForRuntime");
  const compactSourceEnd = source.indexOf("function estimateCompactProjectedTileRefCount", compactSourceStart);
  const compactSource = source.slice(compactSourceStart, compactSourceEnd);
  const candidatesStart = source.indexOf("function compactProjectionRetentionCandidates");
  const candidatesEnd = source.indexOf("function compactProjectionRetentionReplacementIndex", candidatesStart);
  const candidatesSource = source.slice(candidatesStart, candidatesEnd);

  assert.match(compactSource, /selectCompactProjectionRetentionRecords\(\s*projectedTileRecords,\s*maxRefsPerTile,\s*\{/);
  assert.match(compactSource, /retentionRecords:\s*bucket\.retentionRecords\.records/);
  assert.match(compactSource, /occlusionRecords:\s*bucket\.occlusionRecords\.records/);
  assert.doesNotMatch(candidatesSource, /records:\s*\[\.\.\.records\]\.sort\(compareCompactProjectionRetentionPriority\)/);
  assert.doesNotMatch(candidatesSource, /records:\s*\[\.\.\.records\]\.sort\(compareCompactProjectionOcclusionPriority\)/);
});

test("compact finalize retention uses non-string full-identity keys", () => {
  const source = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");
  const keyStart = source.indexOf("function compactProjectionRetentionRecordKey");
  const keyEnd = source.indexOf("function compactMaxRetainedViewRank", keyStart);
  const keySource = source.slice(keyStart, keyEnd);
  const candidatesStart = source.indexOf("function compactProjectionRetentionCandidates");
  const candidatesEnd = source.indexOf("function compactProjectionRetentionReplacementIndex", candidatesStart);
  const candidatesSource = source.slice(candidatesStart, candidatesEnd);

  assert.match(keySource, /function compactProjectionRetentionRecordKey\([^)]*\):\s*bigint/);
  assert.match(keySource, /BigInt\(contributor\.tileIndex\)\s*<<\s*64n/);
  assert.match(keySource, /BigInt\(contributor\.splatIndex\)\s*<<\s*32n/);
  assert.match(keySource, /BigInt\(contributor\.originalId\)/);
  assert.doesNotMatch(keySource, /`/);
  assert.doesNotMatch(candidatesSource, /`\$\{poolIndex\}:/);
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
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);
  const initialWait = frameSource.indexOf("waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs, {");
  const interactionWait = frameSource.indexOf("applyCaptureInteractions", initialWait + 1);
  const catchStart = frameSource.indexOf("} catch (error) {", initialWait);
  const routedFailure = frameSource.indexOf("captureTimeoutFailureWithRoute", catchStart);

  assert.ok(initialWait > 0);
  assert.ok(interactionWait > initialWait);
  assert.ok(catchStart > interactionWait);
  assert.ok(routedFailure > catchStart);
});

test("operator witness readiness polling uses the capture timeout instead of the 1s generic evidence cap", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const waitStart = source.indexOf("async function waitForVisualSmokeCaptureReady");
  const waitEnd = source.indexOf("function operatorWitnessReadinessMatches", waitStart);
  const waitSource = source.slice(waitStart, waitEnd);

  assert.match(waitSource, /collectPageEvidenceWithTimeout\(page, timeoutMs\)/);
});

test("operator witness frame reuses readiness evidence instead of repeating a page bridge read", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(frameSource, /let readinessEvidence/);
  assert.doesNotMatch(frameSource, /collectPageEvidenceWithTimeout\(page, timeoutMs\)/);
});

test("operator witness session caches the canvas clip before per-frame captures", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(sessionSource, /clip = await .*canvasClip\(canvas,/s);
  assert.match(sessionSource, /clip,/);
  assert.doesNotMatch(frameSource, /canvasClip\(canvas,/);
});

test("operator witness session hides overlays once before per-frame captures", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(sessionSource, /page\.addStyleTag\(\{/);
  assert.doesNotMatch(frameSource, /page\.addStyleTag\(\{/);
});

test("operator witness frame screenshots are bounded by the capture screenshot timeout", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(
    frameSource,
    /page\.screenshot\(\{\s*path: screenshotPath,\s*clip,\s*timeout: capture\.timeoutScreenshotMs \?\? TIMEOUT_SCREENSHOT_MS,\s*\}\)/
  );
});

test("operator witness harness timeouts are routed into failure captures", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);

  assert.match(frameSource, /if \(!isRecoverableVisualSmokeTimeout\(error\)\) \{/);
  assert.match(frameSource, /error: normalizeVisualSmokeTimeoutError\(error, timeoutMs\),/);
});

test("operator witness initial page readiness timeouts produce a first-capture failure report", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);

  assert.match(sessionSource, /page\.locator\("canvas"\)\.first\(\)/);
  assert.match(sessionSource, /captureTimeoutFailureWithRoute\(\{/);
  assert.match(sessionSource, /capture: plan\[0\],/);
  assert.match(sessionSource, /error: normalizeVisualSmokeTimeoutError\(error, timeoutMs\),/);
});

test("operator witness interactions bound their canvas lookup by the capture timeout", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const frameStart = source.indexOf("async function captureOperatorWitnessFrame");
  const frameEnd = source.indexOf("async function captureVisualSmoke", frameStart);
  const frameSource = source.slice(frameStart, frameEnd);
  const interactionStart = source.indexOf("async function applyCaptureInteractions");
  const interactionEnd = source.indexOf("async function captureTimeoutFailure", interactionStart);
  const interactionSource = source.slice(interactionStart, interactionEnd);

  assert.match(frameSource, /applyCaptureInteractions\(\{ page, canvas, interactions: capture\.interactions, timeoutMs \}\)/);
  assert.match(
    interactionSource,
    /withTimeout\(\s*canvas\.boundingBox\(\),\s*timeoutMs,\s*`operator witness interaction canvas lookup timed out after \$\{timeoutMs\}ms`\s*\)/
  );
  assert.match(
    interactionSource,
    /withTimeout\(\s*runCaptureInteractions\(\{ page, canvas, interactions, timeoutMs \}\),\s*timeoutMs,\s*`operator witness interactions timed out after \$\{timeoutMs\}ms`\s*\)/
  );
});

test("operator witness interactions use the app-side camera hook before mouse fallback", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const interactionStart = source.indexOf("async function applyCaptureInteractions");
  const interactionEnd = source.indexOf("async function captureTimeoutFailure", interactionStart);
  const interactionSource = source.slice(interactionStart, interactionEnd);
  const mainSource = readFileSync(new URL("../../src/main.ts", import.meta.url), "utf8");

  assert.match(interactionSource, /applyOperatorWitnessInteraction\(\{ page, interaction, timeoutMs \}\)/);
  assert.match(interactionSource, /if \(appliedRevision !== null && handledByHook\) \{/);
  assert.match(mainSource, /__MESH_SPLAT_APPLY_WITNESS_INTERACTION__/);
});

test("operator witness session stops after a timeout capture to avoid racing the same page", () => {
  const source = readFileSync(new URL("../../scripts/run-visual-smoke.mjs", import.meta.url), "utf8");
  const sessionStart = source.indexOf("async function captureOperatorWitnessSession");
  const sessionEnd = source.indexOf("async function captureOperatorWitnessFrame", sessionStart);
  const sessionSource = source.slice(sessionStart, sessionEnd);

  assert.match(sessionSource, /const captureResult = await .*captureOperatorWitnessFrame\(\{/s);
  assert.match(sessionSource, /if \(captureResult\.captureFailure\) \{\s*break;\s*\}/);
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
    timing,
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
    timing,
  };
}
