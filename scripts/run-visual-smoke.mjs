#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import net from "node:net";
import path from "node:path";

import { withTimeout } from "./visual-smoke/async-timeout.mjs";
import { classifySmokeEvidence } from "./visual-smoke/evidence.mjs";
import { buildTimeoutFailureCapture } from "./visual-smoke/failure-telemetry.mjs";
import { analyzePngBuffer, decodePng } from "./visual-smoke/png-analysis.mjs";
import {
  buildTileLocalComparisonPlan,
  classifyTileLocalComparison,
  extractTileLocalPageMetrics,
  isVisualSmokeCaptureReady,
  classifyArenaRuntimeState,
} from "./visual-smoke/tile-local-comparison.mjs";
import {
  buildTileLocalDiagnosticPlan,
  classifyTileLocalDiagnostics,
} from "./visual-smoke/tile-local-diagnostics.mjs";
import {
  buildStaticDessertWitnessPlan,
  classifyStaticDessertWitness,
} from "./visual-smoke/static-dessert-witness.mjs";
import {
  buildOperatorWitnessLoopPlan,
  classifyOperatorWitnessLoop,
  writeOperatorWitnessContactSheet,
} from "./visual-smoke/operator-witness-loop.mjs";
import {
  buildGpuLiveParityImageComparisons,
  buildGpuLiveParityMugshotPlan,
  classifyGpuLiveParityMugshot,
  writeGpuLiveParityMugshotContactSheet,
} from "./visual-smoke/gpu-live-parity-mugshot.mjs";
import { classifyWitnessCapture } from "./visual-smoke/witness-diagnostics.mjs";
import {
  buildSmokeHandoff,
  parseSmokeKind,
  renderSmokeHandoffSection,
} from "./visual-smoke/smoke-handoff.mjs";
import { buildTraceCanvasParityEvidence } from "./visual-smoke/trace-canvas-parity.mjs";
import { buildLivePixelPatchTraceEvidence } from "../src/rendererFidelityProbes/livePixelPatchTrace.js";

const PAGE_EVIDENCE_TIMEOUT_MS = 1000;
const TIMEOUT_SCREENSHOT_MS = 5000;

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const reportDir = path.resolve(options.appRoot, options.reportDir ?? defaultReportDir());
  await mkdir(reportDir, { recursive: true });

  const server = options.url ? null : await startViteServer(options);
  const url = options.url ?? server.url;
  const generatedAt = new Date().toISOString();
  const screenshotPath = path.join(reportDir, "canvas.png");
  const analysisPath = path.join(reportDir, "analysis.json");
  const reportPath = path.join(reportDir, "report.md");
  const gitIdentity = gitIdentityForPath(options.appRoot);

  const consoleMessages = [];
  const pageErrors = [];
  let browser;

  try {
    const { chromium } = await loadPlaywright();
    browser = await chromium.launch({
      channel: options.browserChannel,
      executablePath: options.browserExecutable,
      headless: options.headless,
      args: ["--enable-unsafe-webgpu"],
    });

    if (options.tileLocalComparison) {
      const comparison = await runTileLocalComparison({
        browser,
        options,
        baseUrl: url,
        reportDir,
        analysisPath,
        reportPath,
        generatedAt,
      });
      await writeFile(analysisPath, `${JSON.stringify(comparison, null, 2)}\n`);
      await writeFile(reportPath, renderTileLocalComparisonReport(comparison));
      printTileLocalComparisonSummary(comparison);
      if (!comparison.classification.closeable) {
        process.exitCode = 3;
      }
      return;
    }

    if (options.tileLocalDiagnostics) {
      const diagnostics = await runTileLocalDiagnostics({
        browser,
        options,
        baseUrl: url,
        reportDir,
        analysisPath,
        reportPath,
        generatedAt,
      });
      await writeFile(analysisPath, `${JSON.stringify(diagnostics, null, 2)}\n`);
      await writeFile(reportPath, renderTileLocalDiagnosticsReport(diagnostics));
      printTileLocalDiagnosticsSummary(diagnostics);
      if (!diagnostics.classification.closeable) {
        process.exitCode = 4;
      }
      return;
    }

    if (options.staticDessertWitness) {
      const witness = await runStaticDessertWitness({
        browser,
        options,
        baseUrl: url,
        reportDir,
        analysisPath,
        reportPath,
        generatedAt,
      });
      await writeFile(analysisPath, `${JSON.stringify(witness, null, 2)}\n`);
      await writeFile(reportPath, renderStaticDessertWitnessReport(witness));
      printStaticDessertWitnessSummary(witness);
      if (!witness.classification.closeable) {
        process.exitCode = 5;
      }
      return;
    }

    if (options.operatorWitnessLoop) {
      const witness = await runOperatorWitnessLoop({
        browser,
        options,
        baseUrl: url,
        reportDir,
        analysisPath,
        reportPath,
        generatedAt,
      });
      await writeFile(analysisPath, `${JSON.stringify(witness, null, 2)}\n`);
      await writeFile(reportPath, renderOperatorWitnessLoopReport(witness));
      printOperatorWitnessLoopSummary(witness);
      if (!witness.classification.closeable) {
        process.exitCode = 6;
      }
      return;
    }

    if (options.gpuLiveParityMugshot) {
      const witness = await runGpuLiveParityMugshot({
        browser,
        options,
        baseUrl: url,
        reportDir,
        analysisPath,
        reportPath,
        generatedAt,
      });
      await writeFile(analysisPath, `${JSON.stringify(witness, null, 2)}\n`);
      await writeFile(reportPath, renderGpuLiveParityMugshotReport(witness));
      printGpuLiveParityMugshotSummary(witness);
      if (!witness.classification.closeable) {
        process.exitCode = 7;
      }
      return;
    }

    const page = await browser.newPage({
      viewport: options.viewport,
      deviceScaleFactor: options.deviceScaleFactor,
    });
    page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: options.timeoutMs });
    try {
      await waitForVisualSmokeCaptureReady(page, "", options.timeoutMs);
    } catch (error) {
      if (!isVisualSmokeTimeoutError(error)) {
        throw error;
      }
      const failureCapture = await captureTimeoutFailure({
        page,
        canvas,
        options,
        capture: {
          id: "canvas",
          title: "Visual smoke capture",
          expectedRendererLabel: "",
          url,
        },
        reportDir,
        error,
        consoleMessages,
        pageErrors,
      });
      const result = {
        generatedAt,
        url,
        screenshotPath: failureCapture.screenshotPath,
        analysisPath: path.relative(options.appRoot, analysisPath),
        reportPath: path.relative(options.appRoot, reportPath),
        smokeHandoff: buildSmokeHandoff(options),
        options: publicOptions(options),
        pageEvidence: failureCapture.pageEvidence,
        imageAnalysis: failureCapture.imageAnalysis,
        classification: failureCapture.classification,
        witnessDiagnostics: failureCapture.witnessDiagnostics,
        captureFailure: failureCapture.captureFailure,
        consoleMessages: failureCapture.consoleMessages,
        pageErrors: failureCapture.pageErrors,
      };
      await writeFile(analysisPath, `${JSON.stringify(result, null, 2)}\n`);
      await writeFile(reportPath, renderMarkdownReport(result));
      printSummary(result);
      process.exitCode = 1;
      return;
    }
    await page.waitForTimeout(options.settleMs);

    const rawPageEvidence = await collectPageEvidenceWithTimeout(page, options.timeoutMs);
    let pageEvidence = {
      ...rawPageEvidence,
      ...extractTileLocalPageMetrics(rawPageEvidence),
    };
    const clip = await canvasClip(canvas);
    await page.addStyleTag({
      content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
    });
    const screenshot = await page.screenshot({ path: screenshotPath, clip });
    const imageAnalysis = analyzePngBuffer(screenshot, options.imageThresholds);
    pageEvidence = attachTraceCanvasParityEvidence({
      pageEvidence,
      screenshot,
      url,
      viewport: options.viewport,
    });
    pageEvidence = attachLivePixelPatchTraceEvidence({
      pageEvidence,
      screenshot,
      url,
      viewport: options.viewport,
      gitIdentity,
    });
    const classification = classifySmokeEvidence({
      pageEvidence,
      imageAnalysis,
      requireRealSplat: options.requireRealSplat,
    });
    const witnessDiagnostics = classifyWitnessCapture({
      pageEvidence,
      imageAnalysis,
      smokeClassification: classification,
    });

    const result = {
      generatedAt,
      url,
      screenshotPath: path.relative(options.appRoot, screenshotPath),
      analysisPath: path.relative(options.appRoot, analysisPath),
      reportPath: path.relative(options.appRoot, reportPath),
      smokeHandoff: buildSmokeHandoff(options),
      options: publicOptions(options),
      pageEvidence,
      imageAnalysis,
      classification,
      witnessDiagnostics,
      consoleMessages,
      pageErrors,
    };

    await writeFile(analysisPath, `${JSON.stringify(result, null, 2)}\n`);
    await writeFile(reportPath, renderMarkdownReport(result));
    printSummary(result);

    if (!classification.nonblank) {
      process.exitCode = 1;
    } else if (options.requireRealSplat && !classification.realSplatEvidence) {
      process.exitCode = 2;
    }
  } finally {
    await browser?.close();
    await server?.close();
  }
}

async function startViteServer(options) {
  const { createServer } = await import("vite");
  const port = options.port ?? (await findFreePort(options.host));
  const server = await createServer({
    root: options.appRoot,
    server: {
      host: options.host,
      port,
      strictPort: true,
      open: false,
    },
  });
  await server.listen();
  const url = server.resolvedUrls?.local?.[0] ?? `http://${options.host}:${port}/`;
  return {
    url,
    close: () => server.close(),
  };
}

async function loadPlaywright() {
  try {
    return await import("playwright-core");
  } catch (error) {
    throw new Error(
      "playwright-core is required for visual smoke capture. Run `npm install` in the repo before `npm run smoke:visual`.",
      { cause: error }
    );
  }
}

async function runTileLocalComparison({ browser, options, baseUrl, reportDir, analysisPath, reportPath, generatedAt }) {
  const plan = buildTileLocalComparisonPlan(baseUrl);
  const captures = [];
  for (const capture of plan) {
    captures.push(await captureVisualSmoke({ browser, options, capture, reportDir }));
  }
  const classification = classifyTileLocalComparison({ captures });

  return {
    generatedAt,
    baseUrl,
    analysisPath: path.relative(options.appRoot, analysisPath),
    reportPath: path.relative(options.appRoot, reportPath),
    smokeHandoff: buildSmokeHandoff(options, {
      smokeKind: "visual",
      decisionRequested: "Judge tile-local visible renderer behavior against plate and prepass baselines.",
      expectedVisualDelta: "visible tile-local output should be distinguishable from plate without bridge-block fallback",
      evidenceSurface: "tile-local comparison report, analysis.json, and captured plate/prepass/visible screenshots",
    }),
    options: publicOptions(options),
    plan,
    captures,
    classification,
  };
}

async function runTileLocalDiagnostics({ browser, options, baseUrl, reportDir, analysisPath, reportPath, generatedAt }) {
  const plan = buildTileLocalDiagnosticPlan(baseUrl);
  const captures = [];
  for (const capture of plan) {
    captures.push(await captureVisualSmoke({ browser, options, capture, reportDir }));
  }
  const classification = classifyTileLocalDiagnostics({ captures });

  return {
    generatedAt,
    baseUrl,
    analysisPath: path.relative(options.appRoot, analysisPath),
    reportPath: path.relative(options.appRoot, reportPath),
    smokeHandoff: buildSmokeHandoff(options, {
      smokeKind: "telemetry",
      decisionRequested: "Judge diagnostic heatmap and compact tile-local evidence availability.",
      expectedVisualDelta: "none expected",
      evidenceSurface: "tile-local diagnostic report, analysis.json, and debug heatmap captures",
    }),
    options: publicOptions(options),
    plan,
    captures,
    classification,
  };
}

async function runStaticDessertWitness({ browser, options, baseUrl, reportDir, analysisPath, reportPath, generatedAt }) {
  const plan = buildStaticDessertWitnessPlan(baseUrl);
  const captures = [];
  for (const capture of plan) {
    captures.push(await captureVisualSmoke({ browser, options, capture, reportDir }));
  }
  const classification = classifyStaticDessertWitness({ captures });

  return {
    generatedAt,
    baseUrl,
    analysisPath: path.relative(options.appRoot, analysisPath),
    reportPath: path.relative(options.appRoot, reportPath),
    smokeHandoff: buildSmokeHandoff(options, {
      smokeKind: "visual",
      decisionRequested: "Judge fixed dessert final-color and debug evidence for renderer-fidelity movement.",
      expectedVisualDelta: "fixed-view final-color should move only in the branch's claimed visual direction",
      evidenceSurface: "static dessert witness report, analysis.json, final-color capture, and debug captures",
    }),
    options: publicOptions(options),
    plan,
    captures,
    classification,
  };
}

async function runOperatorWitnessLoop({ browser, options, baseUrl, reportDir, analysisPath, reportPath, generatedAt }) {
  const plan = buildOperatorWitnessLoopPlan(baseUrl, { timeoutMs: options.timeoutMs });
  const session = await captureOperatorWitnessSession({ browser, options, plan, reportDir });
  const captures = session.captures;
  const contactSheetPath = await writeOperatorWitnessContactSheet({
    captures,
    appRoot: options.appRoot,
    reportDir,
  });
  const classification = classifyOperatorWitnessLoop({ captures, contactSheetPath });

  return {
    generatedAt,
    baseUrl,
    analysisPath: path.relative(options.appRoot, analysisPath),
    reportPath: path.relative(options.appRoot, reportPath),
    contactSheetPath,
    timing: session.timing,
    smokeHandoff: buildSmokeHandoff(options, {
      smokeKind: "visual",
      decisionRequested: "Inspect whole-render-first operator visual evidence before choosing the next renderer repair.",
      expectedVisualDelta: "none expected from this harness-only slice",
      evidenceSurface: "operator witness loop report, contact sheet, per-frame screenshots, and route identity JSON",
    }),
    options: publicOptions(options),
    plan,
    captures,
    classification,
  };
}

async function runGpuLiveParityMugshot({ browser, options, baseUrl, reportDir, analysisPath, reportPath, generatedAt }) {
  const plan = buildGpuLiveParityMugshotPlan(baseUrl, { timeoutMs: options.timeoutMs });
  const cpuSession = await captureOperatorWitnessSession({
    browser,
    options,
    plan: plan.filter((capture) => capture.routeRole === "cpu-reference"),
    reportDir,
  });
  const gpuSession = await captureOperatorWitnessSession({
    browser,
    options,
    plan: plan.filter((capture) => capture.routeRole === "direct-gpu-live"),
    reportDir,
  });
  const capturesById = new Map([...cpuSession.captures, ...gpuSession.captures].map((capture) => [capture.id, capture]));
  const captures = plan.map((capture) => capturesById.get(capture.id)).filter(Boolean);
  const comparisons = await buildGpuLiveParityImageComparisons({
    captures,
    appRoot: options.appRoot,
  });
  const contactSheetPath = await writeGpuLiveParityMugshotContactSheet({
    captures,
    appRoot: options.appRoot,
    reportDir,
  });
  const classification = classifyGpuLiveParityMugshot({
    captures,
    comparisons,
    contactSheetPath,
  });

  return {
    generatedAt,
    baseUrl,
    analysisPath: path.relative(options.appRoot, analysisPath),
    reportPath: path.relative(options.appRoot, reportPath),
    contactSheetPath,
    smokeHandoff: buildSmokeHandoff(options, {
      smokeKind: "visual",
      decisionRequested: "Classify same-view CPU reference versus direct GPU live route divergence before visual repair.",
      expectedVisualDelta: "none expected from this harness-only slice",
      evidenceSurface: "GPU live parity mugshot report, contact sheet, screenshots, route identities, and pair image diffs",
    }),
    options: publicOptions(options),
    plan,
    captures,
    comparisons,
    timing: {
      cpuSession: cpuSession.timing,
      gpuSession: gpuSession.timing,
    },
    classification,
  };
}

async function captureOperatorWitnessSession({ browser, options, plan, reportDir }) {
  const timing = startTiming();
  if (plan.length === 0) {
    return { captures: [], timing: finishTiming(timing) };
  }

  const timeoutMs = Math.max(...plan.map((capture) => capture.timeoutMs ?? options.timeoutMs));
  const consoleMessages = [];
  const pageErrors = [];
  const page = await timeStage(timing, "new-page", () =>
    browser.newPage({
      viewport: options.viewport,
      deviceScaleFactor: options.deviceScaleFactor,
    })
  );
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));
  let canvas;
  let clip;

  try {
    await timeStage(timing, "page-goto", () => page.goto(plan[0].url, { waitUntil: "domcontentloaded", timeout: timeoutMs }));
    canvas = await timeStage(timing, "canvas-locator", () => page.locator("canvas").first());
    await timeStage(timing, "canvas-attached", () => canvas.waitFor({ state: "attached", timeout: timeoutMs }));
    clip = await timeStage(timing, "canvas-clip", () => canvasClip(canvas, plan[0].timeoutCanvasClipMs));
    await timeStage(timing, "hide-overlays", () => page.addStyleTag({
      content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
    }));
    await timeStage(timing, "initial-readiness", () => waitForVisualSmokeCaptureReady(page, plan[0].expectedRendererLabel, timeoutMs));

    const captures = [];
    for (const capture of plan) {
      const captureResult = await timeStage(timing, `capture:${capture.id}`, () => captureOperatorWitnessFrame({
        page,
        canvas,
        options,
        capture,
        clip,
        reportDir,
        consoleMessages,
        pageErrors,
      }));
      captures.push(captureResult);
      if (captureResult.captureFailure) {
        break;
      }
    }
    return { captures, timing: finishTiming(timing) };
  } catch (error) {
    if (!isRecoverableVisualSmokeTimeout(error)) {
      throw error;
    }
    const captures = [await captureTimeoutFailureWithRoute({
      page,
      canvas,
      options,
      capture: plan[0],
      reportDir,
      error: normalizeVisualSmokeTimeoutError(error, timeoutMs),
      consoleMessages,
      pageErrors,
      timing: finishTiming(timing),
      clip,
    })];
    return { captures, timing: finishTiming(timing) };
  } finally {
    await timeStage(timing, "page-close", () => page.close()).catch(() => undefined);
  }
}

async function captureOperatorWitnessFrame({
  page,
  canvas,
  options,
  capture,
  clip,
  reportDir,
  consoleMessages,
  pageErrors,
}) {
  const timeoutMs = capture.timeoutMs ?? options.timeoutMs;
  const timing = startTiming();
  try {
    let readinessEvidence;
    const viewRevision = await timeStage(timing, "apply-view", () =>
      applyOperatorWitnessView(page, capture.witnessView ?? "default", timeoutMs)
    );
    readinessEvidence = await timeStage(timing, "view-readiness", () => waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs, {
      operatorWitness: {
        witnessView: capture.witnessView ?? "default",
        minRevision: viewRevision,
      },
    }));
    await timeStage(timing, "settle-before-interaction", () => page.waitForTimeout(options.settleMs));
    if (Array.isArray(capture.interactions) && capture.interactions.length > 0) {
      const interactionRevision = await timeStage(timing, "interactions", () =>
        applyCaptureInteractions({ page, canvas, interactions: capture.interactions, timeoutMs })
      );
      readinessEvidence = await timeStage(timing, "interaction-readiness", () => waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs, interactionRevision !== null
        ? {
            operatorWitness: {
              witnessView: capture.witnessView ?? "default",
              minRevision: interactionRevision,
            },
          }
        : {}));
      await timeStage(timing, "settle-after-interaction", () => page.waitForTimeout(options.settleMs));
    }

    let pageEvidence = {
      ...readinessEvidence,
      ...extractTileLocalPageMetrics(readinessEvidence),
    };
    const screenshotPath = path.join(reportDir, `${capture.id}.png`);
    const screenshot = await timeStage(timing, "screenshot", () => page.screenshot({
      path: screenshotPath,
      clip,
      timeout: capture.timeoutScreenshotMs ?? TIMEOUT_SCREENSHOT_MS,
    }));
    const imageAnalysis = timeSyncStage(timing, "image-analysis", () => analyzePngBuffer(screenshot, options.imageThresholds));
    pageEvidence = timeSyncStage(timing, "trace-canvas-parity", () => attachTraceCanvasParityEvidence({
      pageEvidence,
      screenshot,
      url: capture.url,
      viewport: options.viewport,
    }));
    const classification = timeSyncStage(timing, "classify-smoke", () => classifySmokeEvidence({
      pageEvidence,
      imageAnalysis,
      requireRealSplat: options.requireRealSplat,
    }));
    const witnessDiagnostics = timeSyncStage(timing, "witness-diagnostics", () => classifyWitnessCapture({
      pageEvidence,
      imageAnalysis,
      smokeClassification: classification,
    }));

    return {
      ...capture,
      timing: finishTiming(timing),
      screenshotPath: path.relative(options.appRoot, screenshotPath),
      routeIdentity: routeIdentityFromCapture(capture, pageEvidence, options),
      pageEvidence,
      imageAnalysis,
      classification,
      witnessDiagnostics,
      consoleMessages: [...consoleMessages],
      pageErrors: [...pageErrors],
    };
  } catch (error) {
    if (!isRecoverableVisualSmokeTimeout(error)) {
      throw error;
    }
    return await captureTimeoutFailureWithRoute({
      page,
      canvas,
      options,
      capture,
      reportDir,
      error: normalizeVisualSmokeTimeoutError(error, timeoutMs),
      consoleMessages,
      pageErrors,
      timing: finishTiming(timing),
      clip,
    });
  }
}

async function captureVisualSmoke({ browser, options, capture, reportDir }) {
  const timeoutMs = capture.timeoutMs ?? options.timeoutMs;
  const consoleMessages = [];
  const pageErrors = [];
  const page = await browser.newPage({
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor,
  });
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  try {
    await page.goto(capture.url, { waitUntil: "domcontentloaded", timeout: timeoutMs });
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: timeoutMs });
    try {
      await waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs);
      await page.waitForTimeout(options.settleMs);
      if (Array.isArray(capture.interactions) && capture.interactions.length > 0) {
        await applyCaptureInteractions({ page, canvas, interactions: capture.interactions });
        await waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, timeoutMs);
        await page.waitForTimeout(options.settleMs);
      }
    } catch (error) {
      if (!isVisualSmokeTimeoutError(error)) {
        throw error;
      }
      return await captureTimeoutFailureWithRoute({
        page,
        canvas,
        options,
        capture,
        reportDir,
        error,
        consoleMessages,
        pageErrors,
      });
    }

    const rawPageEvidence = await collectPageEvidenceWithTimeout(page);
    let pageEvidence = {
      ...rawPageEvidence,
      ...extractTileLocalPageMetrics(rawPageEvidence),
    };
    const clip = await canvasClip(canvas, capture.timeoutCanvasClipMs);
    await page.addStyleTag({
      content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
    });
    const screenshotPath = path.join(reportDir, `${capture.id}.png`);
    const screenshot = await page.screenshot({ path: screenshotPath, clip });
    const imageAnalysis = analyzePngBuffer(screenshot, options.imageThresholds);
    pageEvidence = attachTraceCanvasParityEvidence({
      pageEvidence,
      screenshot,
      url: capture.url,
      viewport: options.viewport,
    });
    const classification = classifySmokeEvidence({
      pageEvidence,
      imageAnalysis,
      requireRealSplat: options.requireRealSplat,
    });
    const witnessDiagnostics = classifyWitnessCapture({
      pageEvidence,
      imageAnalysis,
      smokeClassification: classification,
    });

    return {
      ...capture,
      screenshotPath: path.relative(options.appRoot, screenshotPath),
      routeIdentity: routeIdentityFromCapture(capture, pageEvidence, options),
      pageEvidence,
      imageAnalysis,
      classification,
      witnessDiagnostics,
      consoleMessages,
      pageErrors,
    };
  } finally {
    await page.close();
  }
}

async function captureTimeoutFailureWithRoute({
  page,
  canvas,
  options,
  capture,
  reportDir,
  error,
  consoleMessages,
  pageErrors,
  timing,
  clip,
}) {
  const failureCapture = await captureTimeoutFailure({
    page,
    canvas,
    options,
    capture,
    clip,
    reportDir,
    error,
    consoleMessages,
    pageErrors,
  });
  return {
    ...failureCapture,
    timing: timing ?? failureCapture.timing,
    routeIdentity: routeIdentityFromCapture(capture, failureCapture.pageEvidence ?? {}, options),
  };
}

async function applyOperatorWitnessView(page, witnessView, timeoutMs) {
  const result = await withTimeout(
    page.evaluate((mode) => {
      const setter = globalThis.__MESH_SPLAT_SET_WITNESS_VIEW__;
      if (typeof setter !== "function") {
        return { applied: false, reason: "missing __MESH_SPLAT_SET_WITNESS_VIEW__" };
      }
      return setter(mode);
    }, witnessView),
    timeoutMs,
    `operator witness view switch timed out after ${timeoutMs}ms`
  );
  if (!result || result.applied !== true) {
    throw new Error(`Operator witness view switch failed: ${result?.reason ?? "unknown failure"}`);
  }
  return Number.isFinite(result.revision) ? result.revision : 0;
}

async function applyCaptureInteractions({ page, canvas, interactions, timeoutMs = 30000 }) {
  let appliedRevision = null;
  let handledByHook = true;
  for (const interaction of interactions) {
    const revision = await applyOperatorWitnessInteraction({ page, interaction, timeoutMs });
    if (revision === null) {
      handledByHook = false;
      break;
    }
    appliedRevision = Math.max(appliedRevision ?? revision, revision);
  }
  if (appliedRevision !== null && handledByHook) {
    return appliedRevision;
  }
  return await withTimeout(
    runCaptureInteractions({ page, canvas, interactions, timeoutMs }),
    timeoutMs,
    `operator witness interactions timed out after ${timeoutMs}ms`
  );
}

async function applyOperatorWitnessInteraction({ page, interaction, timeoutMs }) {
  const result = await withTimeout(
    page.evaluate((captureInteraction) => {
      const applyInteraction = globalThis.__MESH_SPLAT_APPLY_WITNESS_INTERACTION__;
      if (typeof applyInteraction !== "function") {
        return { applied: false, reason: "missing __MESH_SPLAT_APPLY_WITNESS_INTERACTION__" };
      }
      return applyInteraction(captureInteraction);
    }, interaction),
    timeoutMs,
    `operator witness interaction hook timed out after ${timeoutMs}ms`
  );
  if (!result || result.applied !== true) {
    return null;
  }
  return Number.isFinite(result.revision) ? result.revision : 0;
}

async function runCaptureInteractions({ page, canvas, interactions, timeoutMs }) {
  const box = await withTimeout(
    canvas.boundingBox(),
    timeoutMs,
    `operator witness interaction canvas lookup timed out after ${timeoutMs}ms`
  );
  if (!box) {
    throw new Error("Canvas is not visible, so operator witness interactions cannot run");
  }
  const centerX = box.x + box.width / 2;
  const centerY = box.y + box.height / 2;
  for (const interaction of interactions) {
    if (interaction.type !== "drag") {
      throw new Error(`Unsupported operator witness interaction: ${interaction.type}`);
    }
    const button = interaction.button === "middle" ? "middle" : interaction.button === "right" ? "right" : "left";
    await page.mouse.move(centerX, centerY);
    await page.mouse.down({ button });
    await page.mouse.move(centerX + interaction.dx, centerY + interaction.dy, { steps: 8 });
    await page.mouse.up({ button });
  }
}

async function captureTimeoutFailure({ page, canvas, options, capture, clip, reportDir, error, consoleMessages, pageErrors }) {
  const rawPageEvidence = error.lastEvidence ?? await collectPageEvidence(page).catch(() => ({}));
  const pageEvidence = {
    ...rawPageEvidence,
    ...extractTileLocalPageMetrics(rawPageEvidence),
  };
  const screenshotFile = path.join(reportDir, `${capture.id}-timeout.png`);
  let screenshotPath;
  let imageAnalysis;

  try {
    clip = clip ?? await canvasClip(canvas, capture.timeoutCanvasClipMs);
    await page.addStyleTag({
      content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
    });
    const screenshot = await page.screenshot({ path: screenshotFile, clip, timeout: capture.timeoutScreenshotMs ?? TIMEOUT_SCREENSHOT_MS });
    screenshotPath = path.relative(options.appRoot, screenshotFile);
    imageAnalysis = analyzePngBuffer(screenshot, options.imageThresholds);
  } catch (canvasScreenshotError) {
    pageErrors.push(canvasScreenshotError.stack || canvasScreenshotError.message);
    try {
      const screenshot = await page.screenshot({
        path: screenshotFile,
        timeout: capture.timeoutScreenshotMs ?? TIMEOUT_SCREENSHOT_MS,
      });
      screenshotPath = path.relative(options.appRoot, screenshotFile);
      imageAnalysis = analyzePngBuffer(screenshot, options.imageThresholds);
    } catch (pageScreenshotError) {
      pageErrors.push(pageScreenshotError.stack || pageScreenshotError.message);
    }
  }

  return buildTimeoutFailureCapture({
    capture,
    error,
    elapsedMs: error.elapsedMs,
    pageEvidence,
    imageAnalysis,
    screenshotPath,
    consoleMessages,
    pageErrors,
  });
}

async function waitForVisualSmokeCaptureReady(page, expectedRendererLabel, timeoutMs, readiness = {}) {
  const startedAt = Date.now();
  let lastEvidence = {};
  while (Date.now() - startedAt < timeoutMs) {
    let rawEvidence;
    try {
      rawEvidence = await collectPageEvidenceWithTimeout(page, timeoutMs);
    } catch (evidenceError) {
      lastEvidence = {
        ...lastEvidence,
        evidenceCollectionError: evidenceError.message,
      };
      await page.waitForTimeout(100);
      continue;
    }
    lastEvidence = {
      ...rawEvidence,
      ...extractTileLocalPageMetrics(rawEvidence),
    };
    if (
      isVisualSmokeCaptureReady(lastEvidence, { expectedRendererLabel }) &&
      operatorWitnessReadinessMatches(lastEvidence, readiness.operatorWitness)
    ) {
      return lastEvidence;
    }
    await page.waitForTimeout(100);
  }

  const error = new Error(
    `Timed out waiting for rendered visual smoke evidence${
      expectedRendererLabel ? ` (${expectedRendererLabel})` : ""
    }; last stats: ${JSON.stringify(lastEvidence.statsText ?? "")}`
  );
  error.name = "VisualSmokeTimeoutError";
  error.lastEvidence = lastEvidence;
  error.elapsedMs = Date.now() - startedAt;
  throw error;
}

function operatorWitnessReadinessMatches(pageEvidence, expectation) {
  if (!expectation) {
    return true;
  }
  const witness = pageEvidence.operatorWitness && typeof pageEvidence.operatorWitness === "object"
    ? pageEvidence.operatorWitness
    : {};
  if (expectation.witnessView && witness.witnessView !== expectation.witnessView) {
    return false;
  }
  if (Number.isFinite(expectation.minRevision) && !(Number(witness.revision) >= expectation.minRevision)) {
    return false;
  }
  return true;
}

function attachTraceCanvasParityEvidence({ pageEvidence, screenshot, url, viewport }) {
  const traceCanvasParity = buildTraceCanvasParityEvidence({
    pageEvidence,
    pngBuffer: screenshot,
    url,
    viewport,
  });
  if (!traceCanvasParity) {
    return pageEvidence;
  }
  return {
    ...pageEvidence,
    witness: {
      ...(pageEvidence.witness && typeof pageEvidence.witness === "object" ? pageEvidence.witness : {}),
      traceCanvasParity,
    },
  };
}

function attachLivePixelPatchTraceEvidence({ pageEvidence, screenshot, url, viewport, gitIdentity }) {
  const livePixelPatchTrace = buildLivePixelPatchTraceEvidence({
    pageEvidence,
    image: decodePng(screenshot),
    url,
    viewport,
    branch: gitIdentity.branch,
    commit: gitIdentity.commit,
  });
  if (!livePixelPatchTrace) {
    return pageEvidence;
  }
  return {
    ...pageEvidence,
    witness: {
      ...(pageEvidence.witness && typeof pageEvidence.witness === "object" ? pageEvidence.witness : {}),
      livePixelPatchTrace,
    },
  };
}

function gitIdentityForPath(cwd) {
  try {
    return {
      branch: execFileSync("git", ["rev-parse", "--abbrev-ref", "HEAD"], { cwd, encoding: "utf8" }).trim(),
      commit: execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd, encoding: "utf8" }).trim(),
    };
  } catch {
    return { branch: null, commit: null };
  }
}

function isVisualSmokeTimeoutError(error) {
  return error?.name === "VisualSmokeTimeoutError";
}

function isRecoverableVisualSmokeTimeout(error) {
  if (isVisualSmokeTimeoutError(error)) {
    return true;
  }
  if (error?.name === "TimeoutError") {
    return true;
  }
  return typeof error?.message === "string" && /\b(?:timed out|Timeout \d+ms exceeded)\b/.test(error.message);
}

function normalizeVisualSmokeTimeoutError(error, timeoutMs) {
  if (isVisualSmokeTimeoutError(error)) {
    return error;
  }
  const normalized = new Error(error?.message ?? `visual smoke capture timed out after ${timeoutMs}ms`);
  normalized.name = "VisualSmokeTimeoutError";
  normalized.elapsedMs = Number.isFinite(error?.elapsedMs) ? error.elapsedMs : timeoutMs;
  normalized.lastEvidence = error?.lastEvidence;
  if (error?.stack) {
    normalized.stack = error.stack;
  }
  return normalized;
}

async function collectPageEvidence(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const stats = document.querySelector("#stats");
    const smoke = globalThis.__MESH_SPLAT_SMOKE__ && typeof globalThis.__MESH_SPLAT_SMOKE__ === "object"
      ? globalThis.__MESH_SPLAT_SMOKE__
      : {};
    const witness = globalThis.__MESH_SPLAT_WITNESS__ && typeof globalThis.__MESH_SPLAT_WITNESS__ === "object"
      ? globalThis.__MESH_SPLAT_WITNESS__
      : undefined;
    const tileLocalDiagnostics =
      globalThis.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__ &&
      typeof globalThis.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__ === "object"
        ? globalThis.__MESH_SPLAT_TILE_LOCAL_DIAGNOSTICS__
        : undefined;
    const datasets = [document.documentElement.dataset, document.body.dataset, canvas?.dataset].filter(Boolean);
    const firstDatasetValue = (...keys) => {
      for (const dataset of datasets) {
        for (const key of keys) {
          if (dataset[key]) return dataset[key];
        }
      }
      return undefined;
    };

    return {
      ...smoke,
      sourceKind: smoke.sourceKind ?? firstDatasetValue("smokeSourceKind", "sourceKind"),
      splatCount: smoke.splatCount ?? firstDatasetValue("splatCount", "smokeSplatCount"),
      assetPath: smoke.assetPath ?? firstDatasetValue("assetPath", "smokeAssetPath"),
      sortBackend: smoke.sortBackend ?? firstDatasetValue("sortBackend", "smokeSortBackend"),
      ready: smoke.ready ?? firstDatasetValue("smokeReady", "ready"),
      tileLocalDiagnostics,
      tileLocal: {
        ...(smoke.tileLocal && typeof smoke.tileLocal === "object" ? smoke.tileLocal : {}),
        diagnostics:
          tileLocalDiagnostics ??
          (smoke.tileLocal && typeof smoke.tileLocal === "object" ? smoke.tileLocal.diagnostics : undefined),
      },
      witness,
      statsText: stats?.textContent ?? "",
      title: document.title,
      bodyText: document.body.innerText?.slice(0, 2000) ?? "",
      canvas: canvas
        ? {
            width: canvas.width,
            height: canvas.height,
            clientWidth: canvas.clientWidth,
            clientHeight: canvas.clientHeight,
          }
        : null,
    };
  });
}

async function collectPageEvidenceWithTimeout(page, timeoutMs = PAGE_EVIDENCE_TIMEOUT_MS) {
  return await withTimeout(
    collectPageEvidence(page),
    timeoutMs,
    `page evidence collection timed out after ${timeoutMs}ms`
  );
}

async function canvasClip(locator, timeoutMs = 30000) {
  const box = await withTimeout(locator.boundingBox(), timeoutMs, `canvas bounding box timed out after ${timeoutMs}ms`);
  if (!box) {
    throw new Error("Canvas is not visible, so no smoke screenshot can be captured");
  }

  return {
    x: Math.max(0, Math.floor(box.x)),
    y: Math.max(0, Math.floor(box.y)),
    width: Math.max(1, Math.ceil(box.width)),
    height: Math.max(1, Math.ceil(box.height)),
  };
}

function renderMarkdownReport(result) {
  const classification = result.classification;
  const image = result.imageAnalysis;
  const evidence = result.pageEvidence;
  const status = classification.closeable ? "PASS" : classification.nonblank ? "PROVISIONAL" : "FAIL";

  return `# Visual Smoke Report

- Status: ${status}
- Generated: ${result.generatedAt}
- URL: ${result.url}
- Screenshot: ${result.screenshotPath ? `\`${path.relative(path.dirname(result.reportPath), result.screenshotPath)}\`` : "not captured"}
- Analysis JSON: \`${path.relative(path.dirname(result.reportPath), result.analysisPath)}\`

${renderSmokeHandoffSection(result.smokeHandoff)}

## Image Evidence

- Canvas PNG: ${image.width}x${image.height}
- Nonblank: ${image.nonblank}
- Changed pixels: ${image.changedPixels} / ${image.totalPixels} (${formatPercent(image.changedPixelRatio)})
- Average background delta: ${image.averageDelta.toFixed(2)}
- Distinct colors: ${image.distinctColorCount}

## Splat Evidence

- Real Scaniverse evidence: ${classification.realSplatEvidence}
- Source kind: ${classification.sourceKind || "not reported"}
- Splat count: ${classification.splatCount || 0}
- Asset path: ${classification.assetPath || "not reported"}
- Sort backend: ${result.pageEvidence.sortBackend || "not reported"}
- Summary: ${classification.summary}

## Renderer Fidelity Witness

- Threshold policy: ${result.witnessDiagnostics.thresholdPolicy}
- Findings: ${result.witnessDiagnostics.findings.length}

\`\`\`json
${JSON.stringify(result.witnessDiagnostics, null, 2)}
\`\`\`

## Sibling Contract Notes

- Synthetic or fixture content may validate this harness, but it does not close first smoke.
- To close first smoke, the integrated page should expose \`window.__MESH_SPLAT_SMOKE__\` or canvas/body data attributes with \`sourceKind\` set to real Scaniverse PLY/SPZ content, a positive \`splatCount\`, and an \`assetPath\`.
- The screenshot must remain nonblank after fixed overlays such as \`#stats\` are hidden, so overlay text cannot satisfy the canvas check.

## Page Evidence

\`\`\`json
${JSON.stringify(evidence, null, 2)}
\`\`\`

## Console

\`\`\`json
${JSON.stringify({ consoleMessages: result.consoleMessages, pageErrors: result.pageErrors }, null, 2)}
\`\`\`
`;
}

function renderTileLocalComparisonReport(result) {
  const classification = result.classification;
  const metrics = classification.metrics;
  return `# Tile-Local Visual/Perf Smoke Report

- Status: ${classification.summary.status}
- Generated: ${result.generatedAt}
- Base URL: ${result.baseUrl}
- Analysis JSON: \`${path.relative(path.dirname(result.reportPath), result.analysisPath)}\`

${renderSmokeHandoffSection(result.smokeHandoff)}

## Captures

${result.captures
  .map(
    (capture) => `### ${capture.title}

- URL: ${capture.url}
- Screenshot: ${renderCaptureScreenshotPath(result, capture)}
- Renderer label: ${capture.pageEvidence.rendererLabel || "not reported"}
- FPS: ${capture.pageEvidence.fps || 0}
- Tile refs: ${capture.pageEvidence.tileLocal?.refs || 0}
- Real splat evidence: ${capture.classification.realSplatEvidence}
- Nonblank: ${capture.classification.nonblank}
- Changed pixels: ${capture.imageAnalysis.changedPixels} / ${capture.imageAnalysis.totalPixels} (${formatPercent(capture.imageAnalysis.changedPixelRatio)})
- Bridge block ratio: ${formatPercent(capture.imageAnalysis.bridgeBlockRatio)}
`
  )
  .join("\n")}

## Comparison

- Plate FPS: ${metrics.fps.plate}
- Silent prepass FPS: ${metrics.fps.prepass} (${formatMetricRatio(metrics.fps.prepassToPlateRatio)} x plate)
- Visible tile-local FPS: ${metrics.fps.visible} (${formatMetricRatio(metrics.fps.visibleToPlateRatio)} x plate)
- Prepass tile refs: ${metrics.tileRefs.prepass}
- Visible tile refs: ${metrics.tileRefs.visible}
- Arena backend: ${metrics.arenaBackend}
- Arena state: ${metrics.arenaState}
- Arena requested backend: ${metrics.arenaRuntime?.requestedArenaBackend || "not reported"}
- Arena effective backend: ${metrics.arenaRuntime?.effectiveArenaBackend || "not reported"}
- CPU bridge build duration ms: ${metrics.cpuBuildDurationMs ?? "not reported"}
- GPU dispatch enqueue duration ms: ${metrics.gpuDispatchEnqueueDurationMs ?? "gpu-unavailable"}
- Plate presentation state: ${metrics.presentation?.plate || "not-applicable"}
- Silent prepass presentation state: ${metrics.presentation?.prepass || "not-applicable"}
- Visible presentation state: ${metrics.presentation?.visible || "not-applicable"}
- Artifact movement: ${metrics.artifactMovement?.status || "not-measured"}${metrics.artifactMovement?.summary ? ` (${metrics.artifactMovement.summary})` : ""}

## Findings

${classification.findings.length === 0 ? "- None" : classification.findings.map((finding) => `- ${finding.kind}: ${finding.summary}`).join("\n")}

## Summary

${classification.summary.text}
`;
}

function renderTileLocalDiagnosticsReport(result) {
  const classification = result.classification;
  const metrics = classification.metrics;
  return `# Tile-Local Diagnostic Heatmap Report

- Status: ${classification.summary.status}
- Generated: ${result.generatedAt}
- Base URL: ${result.baseUrl}
- Analysis JSON: \`${path.relative(path.dirname(result.reportPath), result.analysisPath)}\`

${renderSmokeHandoffSection(result.smokeHandoff)}

## Captures

${result.captures
  .map(
    (capture) => `### ${capture.title}

- URL: ${capture.url}
- Screenshot: ${renderCaptureScreenshotPath(result, capture)}
- Renderer label: ${capture.pageEvidence.rendererLabel || "not reported"}
- Tile refs: ${capture.pageEvidence.tileLocal?.refs || 0}
- Debug mode: ${capture.pageEvidence.tileLocal?.diagnostics?.debugMode || "not reported"}
- Nonblank: ${capture.classification.nonblank}
- Changed pixels: ${capture.imageAnalysis.changedPixels} / ${capture.imageAnalysis.totalPixels} (${formatPercent(capture.imageAnalysis.changedPixelRatio)})
`
  )
  .join("\n")}

## Compact Diagnostics

- Required modes present: ${metrics.requiredModesPresent}
- Presentation status: ${metrics.presentationStatus || "not reported"}
- Total tile refs: ${metrics.totalTileRefs}
- Max tile refs per tile: ${metrics.maxTileRefsPerTile}
- Projected arena refs: ${metrics.projectedArenaRefs}
- Retained arena refs: ${metrics.retainedArenaRefs}
- Dropped arena refs: ${metrics.droppedArenaRefs}
- Overflow reasons: ${metrics.overflowReasons?.length ? metrics.overflowReasons.join(", ") : "none"}
- Tile-local CPU projected refs per tile: ${metrics.cpuProjectedRefsPerTile}
- Tile-local CPU bridge build duration ms: ${metrics.cpuBuildDurationMs}
- Arena requested backend: ${metrics.arenaRuntime?.requestedArenaBackend || "not reported"}
- Arena effective backend: ${metrics.arenaRuntime?.effectiveArenaBackend || "not reported"}
- Arena state: ${classifyArenaRuntimeState(metrics.arenaRuntime)}
- Arena CPU bridge build duration ms: ${metrics.arenaRuntime?.cpuBuildDurationMs ?? "not reported"}
- Arena GPU dispatch enqueue duration ms: ${metrics.arenaRuntime?.gpuDispatchEnqueueDurationMs ?? "not reported"}
- Unavailable reason: ${metrics.arenaRuntime?.unavailableReason || "not reported"}
- Skipped reason: ${metrics.arenaRuntime?.skippedReason || "not reported"}
- GPU retained ref buffer bytes: ${metrics.gpuRetainedRefBufferBytes}
- GPU alpha param buffer bytes: ${metrics.gpuAlphaParamBufferBytes}
- Estimated max accumulated alpha: ${metrics.estimatedMaxAccumulatedAlpha}
- Estimated min transmittance: ${metrics.estimatedMinTransmittance}

## Findings

${classification.findings.length === 0 ? "- None" : classification.findings.map((finding) => `- ${finding.kind}: ${finding.summary}`).join("\n")}

## Summary

${classification.summary.text}
`;
}

function renderStaticDessertWitnessReport(result) {
  const classification = result.classification;
  const metrics = classification.metrics;
  const observations = classification.observations;
  return `# Static Dessert Witness Report

- Status: ${classification.summary.status}
- Generated: ${result.generatedAt}
- Base URL: ${result.baseUrl}
- Analysis JSON: \`${path.relative(path.dirname(result.reportPath), result.analysisPath)}\`

${renderSmokeHandoffSection(result.smokeHandoff)}

## Fixed View

- Asset path: ${metrics.fixedView.assetPath || "not reported"}
- Viewport: ${metrics.fixedView.viewport || "not reported"}
- Tile grid: ${metrics.fixedView.tileGrid || "not reported"}
- Total tile refs: ${metrics.tileRefs.total}
- Max tile refs per tile: ${metrics.tileRefs.maxPerTile}
- Projected tile refs before cap: ${metrics.tileRefCustody.projectedTileEntryCount}
- Retained tile refs after cap: ${metrics.tileRefCustody.retainedTileEntryCount}
- Evicted tile refs by cap: ${metrics.tileRefCustody.evictedTileEntryCount}
- Capped tiles: ${metrics.tileRefCustody.cappedTileCount}
- Saturated retained tiles: ${metrics.tileRefCustody.saturatedRetainedTileCount}
- Max projected refs per tile: ${metrics.tileRefCustody.maxProjectedRefsPerTile}
- Header accounting matches retained refs: ${metrics.tileRefCustody.headerAccountingMatches}
- Retention audit full frame: current ${metrics.retentionAudit.fullFrame.currentRetainedEntryCount} refs vs legacy ${metrics.retentionAudit.fullFrame.legacyRetainedEntryCount}; policy added ${metrics.retentionAudit.fullFrame.addedByPolicyCount}, dropped ${metrics.retentionAudit.fullFrame.droppedByPolicyCount}
- Porous body retention audit: projected ${metrics.retentionAudit.regions.porousBody.projectedTileEntryCount}, current ${metrics.retentionAudit.regions.porousBody.currentRetainedEntryCount}, legacy ${metrics.retentionAudit.regions.porousBody.legacyRetainedEntryCount}; capped tiles ${metrics.retentionAudit.regions.porousBody.cappedTileCount}; policy added ${metrics.retentionAudit.regions.porousBody.addedByPolicyCount}, dropped ${metrics.retentionAudit.regions.porousBody.droppedByPolicyCount}
- Center leak band retention audit: projected ${metrics.retentionAudit.regions.centerLeakBand.projectedTileEntryCount}, current ${metrics.retentionAudit.regions.centerLeakBand.currentRetainedEntryCount}, legacy ${metrics.retentionAudit.regions.centerLeakBand.legacyRetainedEntryCount}; policy added ${metrics.retentionAudit.regions.centerLeakBand.addedByPolicyCount}, dropped ${metrics.retentionAudit.regions.centerLeakBand.droppedByPolicyCount}
- Plate renderer label: ${metrics.rendererBridge.plateRendererLabel || "not reported"}
- Tile-local renderer label: ${metrics.rendererBridge.tileLocalRendererLabel || "not reported"}
- Plate/tile-local same asset: ${metrics.rendererBridge.sameAsset}
- Plate/tile-local same viewport: ${metrics.rendererBridge.sameViewport}
- Plate changed pixels: ${formatPercent(metrics.rendererBridge.plateChangedPixelRatio)}
- Tile-local changed pixels: ${formatPercent(metrics.rendererBridge.tileLocalChangedPixelRatio)}
- Tile-local/plate changed-pixel ratio: ${formatMetricRatio(metrics.rendererBridge.tileLocalToPlateChangedPixelRatio)} (max ${formatMetricRatio(metrics.rendererBridge.maxTileLocalToPlateChangedPixelRatio)})
- Rim crop source centers: ${metrics.sourceSupport.rimBand.projectedCenterCount}
- Rim crop projected support splats: ${metrics.sourceSupport.rimBand.projectedSupportCount}
- Rim crop near-floor minor splats: ${metrics.sourceSupport.rimBand.nearFloorMinorCount}
- Rim crop source sample IDs: ${metrics.sourceSupport.rimBand.sampleOriginalIds.join(", ") || "none"}
- Porous body source centers: ${metrics.sourceSupport.porousBody.projectedCenterCount}
- Porous body projected support splats: ${metrics.sourceSupport.porousBody.projectedSupportCount}
- Porous body near-floor minor splats: ${metrics.sourceSupport.porousBody.nearFloorMinorCount}
- Porous body source sample IDs: ${metrics.sourceSupport.porousBody.sampleOriginalIds.join(", ") || "none"}
- Estimated max accumulated alpha: ${metrics.alpha.estimatedMaxAccumulatedAlpha}
- Estimated min transmittance: ${metrics.alpha.estimatedMinTransmittance}
- Max conic major radius px: ${metrics.conicShape.maxMajorRadiusPx}
- Min conic minor radius px: ${metrics.conicShape.minMinorRadiusPx}
- Max conic anisotropy: ${metrics.conicShape.maxAnisotropy}

## Captures

${result.captures
  .map(
    (capture) => `### ${capture.title}

- URL: ${capture.url}
- Screenshot: ${renderCaptureScreenshotPath(result, capture)}
- Renderer label: ${capture.pageEvidence.rendererLabel || "not reported"}
- Tile refs: ${capture.pageEvidence.tileLocal?.refs || 0}
- Debug mode: ${capture.pageEvidence.tileLocal?.diagnostics?.debugMode || "final-color"}
- Nonblank: ${capture.classification.nonblank}
- Changed pixels: ${capture.imageAnalysis.changedPixels} / ${capture.imageAnalysis.totalPixels} (${formatPercent(capture.imageAnalysis.changedPixelRatio)})
`
  )
  .join("\n")}

## Observation Boundaries

### Visible holes

- Status: ${observations.visibleHoles.status}
- Evidence IDs: ${observations.visibleHoles.evidenceIds.join(", ")}
- Boundary: ${observations.visibleHoles.boundary}

### Plate seepage

- Status: ${observations.plateSeepage.status}
- Evidence IDs: ${observations.plateSeepage.evidenceIds.join(", ")}
- Boundary: ${observations.plateSeepage.boundary}

### High-viewport budget skip

- Status: ${observations.budgetSkip.status}
- Boundary: ${observations.budgetSkip.boundary}
- Repro: ${observations.budgetSkip.repro}

## Findings

${classification.findings.length === 0 ? "- None" : classification.findings.map((finding) => `- ${finding.kind}: ${finding.summary}`).join("\n")}

## Summary

${classification.summary.text}
`;
}

function renderOperatorWitnessLoopReport(result) {
  const classification = result.classification;
  const metrics = classification.metrics;
  const timing = metrics.timing ?? {};
  return `# Operator Witness Loop Report

- Status: ${classification.summary.status}
- Generated: ${result.generatedAt}
- Base URL: ${result.baseUrl}
- Contact sheet: ${result.contactSheetPath ? `\`${path.relative(path.dirname(result.reportPath), result.contactSheetPath)}\`` : "not captured"}
- Analysis JSON: \`${path.relative(path.dirname(result.reportPath), result.analysisPath)}\`

${renderSmokeHandoffSection(result.smokeHandoff)}

## Witness Set

- Capture count: ${metrics.captureCount}
- Operator visual captures: ${metrics.operatorVisualCaptures}
- Filmstrip captures: ${metrics.filmstripCaptures}
- Witness views: ${metrics.witnessViews.join(", ") || "none"}
- Renderers: ${metrics.renderers.join(", ") || "none"}
- Arena backends: ${metrics.arenaBackends.join(", ") || "none"}
- Tile budgets: ${metrics.tileBudgets.join(", ") || "none"}

## Timing

- Total loop ms: ${result.timing?.totalMs ?? "not reported"}
- Total capture ms: ${timing.totalCaptureMs ?? "not reported"}
- Slowest capture: ${timing.slowestCapture ? `${timing.slowestCapture.id} (${timing.slowestCapture.totalMs}ms)` : "not reported"}
- Slowest stage: ${timing.slowestStage ? `${timing.slowestStage.captureId}/${timing.slowestStage.name} (${timing.slowestStage.elapsedMs}ms)` : "not reported"}
- Slowest app frame stage: ${timing.slowestAppFrameStage ? `${timing.slowestAppFrameStage.captureId}/${timing.slowestAppFrameStage.name} (${timing.slowestAppFrameStage.elapsedMs}ms, frame ${timing.slowestAppFrameStage.frameSerial})` : "not reported"}

${renderOperatorTimingTable(timing)}

## Captures

${result.captures
  .map(
    (capture) => `### ${capture.title}

- Evidence role: ${capture.evidenceRole || "operator-visual"}
- URL: ${capture.url}
- Screenshot: ${renderCaptureScreenshotPath(result, capture)}
- Renderer label: ${capture.pageEvidence.rendererLabel || "not reported"}
- Tile refs: ${capture.pageEvidence.tileLocal?.refs || 0}
- Witness view: ${capture.routeIdentity?.witnessView || "default"}
- Interaction count: ${Array.isArray(capture.interactions) ? capture.interactions.length : 0}
- Nonblank: ${capture.classification.nonblank}
- Real splat evidence: ${capture.classification.realSplatEvidence}
- Changed pixels: ${capture.imageAnalysis.changedPixels} / ${capture.imageAnalysis.totalPixels} (${formatPercent(capture.imageAnalysis.changedPixelRatio)})
- Total capture ms: ${capture.timing?.totalMs ?? "not reported"}
`
  )
  .join("\n")}

## Findings

${classification.findings.length === 0 ? "- None" : classification.findings.map((finding) => `- ${finding.kind}: ${finding.summary}`).join("\n")}

## Route Identity

\`\`\`json
${JSON.stringify(result.captures.map((capture) => ({ id: capture.id, role: capture.evidenceRole, routeIdentity: capture.routeIdentity })), null, 2)}
\`\`\`

## Boundary

- This is operator visual evidence, not trace evidence.
- Trace and presentation anchors are removed from every capture URL.
- Broad multi-anchor trace diagnostics remain a separate blocker.
- This harness does not claim production visual repair.

## Summary

${classification.summary.text}
`;
}

function renderGpuLiveParityMugshotReport(result) {
  const classification = result.classification;
  const metrics = classification.metrics;
  const divergence = classification.divergence;
  return `# GPU Live Parity Mugshot Report

- Status: ${classification.summary.status}
- Generated: ${result.generatedAt}
- Base URL: ${result.baseUrl}
- Contact sheet: ${result.contactSheetPath ? `\`${path.relative(path.dirname(result.reportPath), result.contactSheetPath)}\`` : "not captured"}
- Analysis JSON: local-only, omitted from committed evidence artifacts

${renderSmokeHandoffSection(result.smokeHandoff)}

## Witness Set

- Capture count: ${metrics.captureCount}
- Pair count: ${metrics.pairCount}
- Witness views: ${metrics.witnessViews.join(", ") || "none"}
- Route roles: ${metrics.routeRoles.join(", ") || "none"}
- Arena backends: ${metrics.arenaBackends.join(", ") || "none"}
- Effective arena backends: ${metrics.effectiveArenaBackends.join(", ") || "none"}
- Tile budgets: ${metrics.tileBudgets.join(", ") || "none"}
- Primary divergence: ${divergence.primary}
- Pairs needing investigation: ${divergence.pairsNeedingInvestigation}
- Tile-ref divergence pairs: ${divergence.tileRefDivergencePairs.join(", ") || "none"}
- Final-color divergence pairs: ${divergence.finalColorDivergencePairs.join(", ") || "none"}

## Pairs

${metrics.pairs
  .map(
    (pair) => `### ${pair.pairId}

- Witness view: ${pair.witnessView}
- CPU capture: ${pair.cpuCaptureId}
- GPU capture: ${pair.gpuCaptureId}
- CPU refs: ${pair.cpuRefs}
- GPU refs: ${pair.gpuRefs}
- CPU ref source: ${pair.cpuRefSource || "not reported"}
- GPU ref source: ${pair.gpuRefSource || "not reported"}
- Ref ratio: ${formatMetricRatio(pair.refRatio)}
- CPU effective arena: ${pair.cpuEffectiveArenaBackend || "not reported"}
- GPU effective arena: ${pair.gpuEffectiveArenaBackend || "not reported"}
- Changed pixels: ${pair.changedPixels} / ${pair.totalPixels} (${formatPercent(pair.changedPixelRatio)})
- Image comparable: ${pair.imageComparable}${pair.imageComparisonReason ? ` (${pair.imageComparisonReason})` : ""}
`
  )
  .join("\n")}

## Captures

${result.captures
  .map(
    (capture) => `### ${capture.title}

- Pair: ${capture.pairId || "not reported"}
- Route role: ${capture.routeRole || "not reported"}
- URL: ${capture.url}
- Screenshot: ${renderCaptureScreenshotPath(result, capture)}
- Renderer label: ${capture.pageEvidence.rendererLabel || "not reported"}
- Tile refs: ${capture.pageEvidence.tileLocal?.refs || 0}
- Tile ref source: ${capture.pageEvidence.tileLocal?.refAccounting?.source ?? capture.pageEvidence.tileLocal?.refStatsReadback?.source ?? "not reported"}
- Arena requested/effective: ${capture.routeIdentity?.arenaBackend || "not reported"} / ${capture.routeIdentity?.effectiveArenaBackend || "not reported"}
- Witness view: ${capture.routeIdentity?.witnessView || "default"}
- Generic nonblank smoke: ${capture.classification.nonblank}
- Generic real splat smoke: ${capture.classification.realSplatEvidence}
- Page source: ${capture.pageEvidence.sourceKind || "not reported"} / ${capture.pageEvidence.splatCount || 0} splats
- Changed pixels vs background: ${capture.imageAnalysis.changedPixels} / ${capture.imageAnalysis.totalPixels} (${formatPercent(capture.imageAnalysis.changedPixelRatio)})
- Parity pixel evidence: ${Number(capture.imageAnalysis.changedPixels || 0) > 0}
`
  )
  .join("\n")}

## Findings

${classification.findings.length === 0 ? "- None" : classification.findings.map((finding) => `- ${finding.kind}: ${finding.summary}`).join("\n")}

## Route Identity

\`\`\`json
${JSON.stringify(result.captures.map((capture) => ({ id: capture.id, pairId: capture.pairId, routeRole: capture.routeRole, routeIdentity: capture.routeIdentity })), null, 2)}
\`\`\`

## Boundary

- This witness compares final-color CPU/reference and direct GPU-live tile-local routes under the same camera/view.
- It does not repair alpha, conic, ordering, source selection, camera, tile caps, or deferred semantics.
- CPU/reference remains an observable oracle; direct GPU remains the live presentation route under test.

## Summary

${classification.summary.text}
`;
}

function renderOperatorTimingTable(timing = {}) {
  const captures = Array.isArray(timing.captures) ? timing.captures : [];
  if (captures.length === 0) {
    return "- Per-capture timings: not reported";
  }
  return captures
    .map((capture) => {
      const stages = Array.isArray(capture.stages)
        ? capture.stages.map((stage) => `${stage.name}:${stage.elapsedMs}ms`).join(", ")
        : "";
      return `- ${capture.id}: ${capture.totalMs}ms${stages ? ` (${stages})` : ""}`;
    })
    .join("\n");
}

function printSummary(result) {
  console.log(result.classification.summary);
  console.log(`report: ${result.reportPath}`);
  console.log(`screenshot: ${result.screenshotPath}`);
}

function renderCaptureScreenshotPath(result, capture) {
  return capture.screenshotPath
    ? `\`${path.relative(path.dirname(result.reportPath), capture.screenshotPath)}\``
    : "not captured";
}

function formatMetricRatio(value) {
  return Number.isFinite(value) ? String(value) : "n/a";
}

function printTileLocalComparisonSummary(result) {
  console.log(result.classification.summary.text);
  console.log(`report: ${result.reportPath}`);
  console.log(`arena state: ${result.classification.metrics.arenaState}`);
  for (const capture of result.captures) {
    console.log(`${capture.id}: ${capture.screenshotPath}`);
  }
}

function printTileLocalDiagnosticsSummary(result) {
  console.log(result.classification.summary.text);
  console.log(`report: ${result.reportPath}`);
  console.log(`arena state: ${classifyArenaRuntimeState(result.classification.metrics.arenaRuntime)}`);
  for (const capture of result.captures) {
    console.log(`${capture.id}: ${capture.screenshotPath}`);
  }
}

function printStaticDessertWitnessSummary(result) {
  console.log(result.classification.summary.text);
  console.log(`report: ${result.reportPath}`);
  for (const capture of result.captures) {
    console.log(`${capture.id}: ${capture.screenshotPath}`);
  }
}

function printOperatorWitnessLoopSummary(result) {
  console.log(result.classification.summary.text);
  console.log(`report: ${result.reportPath}`);
  console.log(`contact sheet: ${result.contactSheetPath ?? "not captured"}`);
  for (const capture of result.captures) {
    console.log(`${capture.id}: ${capture.screenshotPath}`);
  }
}

function printGpuLiveParityMugshotSummary(result) {
  console.log(result.classification.summary.text);
  console.log(`report: ${result.reportPath}`);
  console.log(`contact sheet: ${result.contactSheetPath ?? "not captured"}`);
  console.log(`primary divergence: ${result.classification.divergence.primary}`);
  for (const capture of result.captures) {
    console.log(`${capture.id}: ${capture.screenshotPath}`);
  }
}

function parseArgs(args) {
  const options = {
    appRoot: process.cwd(),
    host: "127.0.0.1",
    port: undefined,
    url: undefined,
    reportDir: undefined,
    requireRealSplat: false,
    headless: true,
    browserChannel: process.env.VISUAL_SMOKE_BROWSER_CHANNEL || "chrome",
    browserExecutable: process.env.VISUAL_SMOKE_BROWSER_EXECUTABLE,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    timeoutMs: 15000,
    settleMs: 1000,
    imageThresholds: {},
    tileLocalComparison: false,
    tileLocalDiagnostics: false,
    staticDessertWitness: false,
    operatorWitnessLoop: false,
    gpuLiveParityMugshot: false,
    smokeKind: undefined,
    decisionRequested: undefined,
    expectedVisualDelta: undefined,
    evidenceSurface: undefined,
  };

  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = () => {
      index += 1;
      if (index >= args.length) throw new Error(`Missing value for ${arg}`);
      return args[index];
    };

    switch (arg) {
      case "--app-root":
        options.appRoot = path.resolve(next());
        break;
      case "--url":
        options.url = next();
        break;
      case "--host":
        options.host = next();
        break;
      case "--port":
        options.port = Number(next());
        break;
      case "--report-dir":
      case "--out-dir":
        options.reportDir = next();
        break;
      case "--require-real-splat":
      case "--expect-real":
        options.requireRealSplat = true;
        break;
      case "--browser-channel":
        options.browserChannel = next();
        break;
      case "--browser-executable":
        options.browserExecutable = next();
        options.browserChannel = undefined;
        break;
      case "--headed":
        options.headless = false;
        break;
      case "--viewport":
        options.viewport = parseViewport(next());
        break;
      case "--device-scale-factor":
        options.deviceScaleFactor = Number(next());
        break;
      case "--timeout-ms":
        options.timeoutMs = Number(next());
        break;
      case "--settle-ms":
        options.settleMs = Number(next());
        break;
      case "--min-changed-pixel-ratio":
        options.imageThresholds.minChangedPixelRatio = Number(next());
        break;
      case "--min-average-delta":
        options.imageThresholds.minAverageDelta = Number(next());
        break;
      case "--tile-local-comparison":
      case "--compare-tile-local":
        options.tileLocalComparison = true;
        options.requireRealSplat = true;
        if (options.settleMs === 1000) {
          options.settleMs = 5000;
        }
        break;
      case "--tile-local-diagnostics":
      case "--tile-local-debug-captures":
        options.tileLocalDiagnostics = true;
        options.requireRealSplat = true;
        if (options.settleMs === 1000) {
          options.settleMs = 5000;
        }
        break;
      case "--static-dessert-witness":
      case "--dessert-witness":
        options.staticDessertWitness = true;
        options.requireRealSplat = true;
        if (options.settleMs === 1000) {
          options.settleMs = 5000;
        }
        break;
      case "--operator-witness-loop":
      case "--operator-visual-witness":
        options.operatorWitnessLoop = true;
        options.requireRealSplat = true;
        if (options.settleMs === 1000) {
          options.settleMs = 5000;
        }
        break;
      case "--gpu-live-parity-mugshot":
      case "--cpu-gpu-live-parity":
        options.gpuLiveParityMugshot = true;
        options.requireRealSplat = true;
        if (options.timeoutMs === 15000) {
          options.timeoutMs = 60000;
        }
        if (options.settleMs === 1000) {
          options.settleMs = 5000;
        }
        break;
      case "--smoke-kind":
        options.smokeKind = parseSmokeKind(next());
        break;
      case "--decision-requested":
        options.decisionRequested = next();
        break;
      case "--expected-visual-delta":
        options.expectedVisualDelta = next();
        break;
      case "--evidence-surface":
        options.evidenceSurface = next();
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }

  return options;
}

function publicOptions(options) {
  return {
    appRoot: path.relative(process.cwd(), options.appRoot) || ".",
    host: options.host,
    port: options.port,
    url: options.url,
    reportDir: options.reportDir,
    requireRealSplat: options.requireRealSplat,
    headless: options.headless,
    browserChannel: options.browserChannel,
    browserExecutable: options.browserExecutable,
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor,
    timeoutMs: options.timeoutMs,
    settleMs: options.settleMs,
    imageThresholds: options.imageThresholds,
    tileLocalComparison: options.tileLocalComparison,
    tileLocalDiagnostics: options.tileLocalDiagnostics,
    staticDessertWitness: options.staticDessertWitness,
    operatorWitnessLoop: options.operatorWitnessLoop,
    gpuLiveParityMugshot: options.gpuLiveParityMugshot,
    smokeHandoff: buildSmokeHandoff(options),
  };
}

function routeIdentityFromCapture(capture, pageEvidence, options) {
  const url = new URL(capture.url);
  return {
    captureId: capture.id,
    evidenceRole: capture.evidenceRole || "operator-visual",
    assetPath: url.searchParams.get("asset") || pageEvidence.assetPath || null,
    witnessView: capture.witnessView || url.searchParams.get("witnessView") || url.searchParams.get("view") || "default",
    renderer: url.searchParams.get("renderer") || pageEvidence.rendererLabel || null,
    arenaBackend: url.searchParams.get("arenaBackend") || pageEvidence.arenaRuntime?.requestedArenaBackend || null,
    effectiveArenaBackend: pageEvidence.arenaRuntime?.effectiveArenaBackend || null,
    tileSizePx: url.searchParams.get("tileSizePx") || pageEvidence.tileLocal?.diagnostics?.config?.tileSizePx || null,
    maxRefsPerTile: url.searchParams.get("maxRefsPerTile") || pageEvidence.tileLocal?.diagnostics?.config?.maxRefsPerTile || null,
    traceAnchors: url.searchParams.get("traceAnchors") || url.searchParams.get("traceAnchor") || null,
    presentationAnchors:
      url.searchParams.get("presentationAnchors") ||
      url.searchParams.get("presentationAnchor") ||
      url.searchParams.get("tileLocalPresentationAnchors") ||
      url.searchParams.get("tileLocalPresentationAnchor") ||
      null,
    presentationScope:
      url.searchParams.get("presentationScope") ||
      url.searchParams.get("presentationMode") ||
      url.searchParams.get("tileLocalPresentationScope") ||
      url.searchParams.get("tileLocalPresentationMode") ||
      "full-scene",
    viewport: options.viewport,
    canvas: pageEvidence.canvas ?? null,
  };
}

function startTiming() {
  return {
    startedAtMs: Date.now(),
    stages: [],
  };
}

async function timeStage(timing, name, fn) {
  const startedAtMs = Date.now();
  try {
    return await fn();
  } finally {
    timing.stages.push({ name, elapsedMs: Date.now() - startedAtMs });
  }
}

function timeSyncStage(timing, name, fn) {
  const startedAtMs = Date.now();
  try {
    return fn();
  } finally {
    timing.stages.push({ name, elapsedMs: Date.now() - startedAtMs });
  }
}

function finishTiming(timing) {
  return {
    totalMs: Date.now() - timing.startedAtMs,
    stages: timing.stages,
  };
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value);
  if (!match) {
    throw new Error(`Invalid viewport ${value}; expected WIDTHxHEIGHT`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function defaultReportDir() {
  return path.join("smoke-reports", `visual-smoke-${new Date().toISOString().replace(/[:.]/g, "-")}`);
}

function formatPercent(value) {
  return `${(value * 100).toFixed(3)}%`;
}

async function findFreePort(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.once("error", reject);
    server.listen(0, host, () => {
      const address = server.address();
      server.close(() => resolve(address.port));
    });
  });
}

function printHelp() {
  console.log(`Usage: node scripts/run-visual-smoke.mjs [options]

Options:
  --url <url>                     Capture an already-running app instead of launching Vite.
  --app-root <path>               Repo root to launch with Vite. Defaults to cwd.
  --report-dir, --out-dir <path>  Output directory. Defaults to smoke-reports/visual-smoke-<timestamp>.
  --require-real-splat            Exit nonzero unless the page reports real Scaniverse splat evidence.
  --smoke-kind <kind>             Handoff kind: visual or telemetry. Defaults to visual.
  --decision-requested <text>     Merge, rerun, or investigation decision this smoke is meant to support.
  --expected-visual-delta <text>  Expected visual change, or "none expected" for telemetry-only checks.
  --evidence-surface <text>       Report, trace field, timing field, manifest, screenshot, or URL carrying the claim.
  --browser-channel <name>        Playwright channel. Defaults to VISUAL_SMOKE_BROWSER_CHANNEL or chrome.
  --browser-executable <path>     Browser executable path; overrides channel.
  --viewport <WIDTHxHEIGHT>       Browser viewport. Defaults to 1280x720.
  --settle-ms <ms>                Wait after canvas sizing before screenshot. Defaults to 1000, or 5000 for tile-local comparison.
  --tile-local-comparison         Capture plate, renderer=tile-local, and renderer=tile-local-visible in one report.
  --tile-local-diagnostics        Capture tile-local-visible diagnostic heatmaps and compact evidence in one report.
  --static-dessert-witness        Capture fixed dessert final color plus tile-local debug evidence in one report.
  --operator-witness-loop         Capture whole-render-first operator visuals plus close crops and interaction filmstrip.
  --gpu-live-parity-mugshot       Capture CPU reference vs direct GPU live final-color pairs under the same views.
`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
