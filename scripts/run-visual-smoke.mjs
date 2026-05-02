#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

import { classifySmokeEvidence } from "./visual-smoke/evidence.mjs";
import { analyzePngBuffer } from "./visual-smoke/png-analysis.mjs";
import {
  buildTileLocalComparisonPlan,
  classifyTileLocalComparison,
  extractTileLocalPageMetrics,
  isVisualSmokeCaptureReady,
} from "./visual-smoke/tile-local-comparison.mjs";
import {
  buildTileLocalDiagnosticPlan,
  classifyTileLocalDiagnostics,
} from "./visual-smoke/tile-local-diagnostics.mjs";
import {
  buildStaticDessertWitnessPlan,
  classifyStaticDessertWitness,
} from "./visual-smoke/static-dessert-witness.mjs";
import { classifyWitnessCapture } from "./visual-smoke/witness-diagnostics.mjs";

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

    const page = await browser.newPage({
      viewport: options.viewport,
      deviceScaleFactor: options.deviceScaleFactor,
    });
    page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: options.timeoutMs });
    await waitForVisualSmokeCaptureReady(page, "", options.timeoutMs);
    await page.waitForTimeout(options.settleMs);

    const rawPageEvidence = await collectPageEvidence(page);
    const pageEvidence = {
      ...rawPageEvidence,
      ...extractTileLocalPageMetrics(rawPageEvidence),
    };
    const clip = await canvasClip(canvas);
    await page.addStyleTag({
      content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
    });
    const screenshot = await page.screenshot({ path: screenshotPath, clip });
    const imageAnalysis = analyzePngBuffer(screenshot, options.imageThresholds);
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
    options: publicOptions(options),
    plan,
    captures,
    classification,
  };
}

async function captureVisualSmoke({ browser, options, capture, reportDir }) {
  const consoleMessages = [];
  const pageErrors = [];
  const page = await browser.newPage({
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor,
  });
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  try {
    await page.goto(capture.url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: options.timeoutMs });
    await waitForVisualSmokeCaptureReady(page, capture.expectedRendererLabel, options.timeoutMs);
    await page.waitForTimeout(options.settleMs);

    const rawPageEvidence = await collectPageEvidence(page);
    const pageEvidence = {
      ...rawPageEvidence,
      ...extractTileLocalPageMetrics(rawPageEvidence),
    };
    const clip = await canvasClip(canvas);
    await page.addStyleTag({
      content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
    });
    const screenshotPath = path.join(reportDir, `${capture.id}.png`);
    const screenshot = await page.screenshot({ path: screenshotPath, clip });
    const imageAnalysis = analyzePngBuffer(screenshot, options.imageThresholds);
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

async function waitForVisualSmokeCaptureReady(page, expectedRendererLabel, timeoutMs) {
  const startedAt = Date.now();
  let lastEvidence = {};
  while (Date.now() - startedAt < timeoutMs) {
    const rawEvidence = await collectPageEvidence(page);
    lastEvidence = {
      ...rawEvidence,
      ...extractTileLocalPageMetrics(rawEvidence),
    };
    if (isVisualSmokeCaptureReady(lastEvidence, { expectedRendererLabel })) {
      return lastEvidence;
    }
    await page.waitForTimeout(100);
  }

  throw new Error(
    `Timed out waiting for rendered visual smoke evidence${
      expectedRendererLabel ? ` (${expectedRendererLabel})` : ""
    }; last stats: ${JSON.stringify(lastEvidence.statsText ?? "")}`
  );
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

async function canvasClip(locator) {
  const box = await locator.boundingBox();
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
- Screenshot: \`${path.relative(path.dirname(result.reportPath), result.screenshotPath)}\`
- Analysis JSON: \`${path.relative(path.dirname(result.reportPath), result.analysisPath)}\`

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

## Captures

${result.captures
  .map(
    (capture) => `### ${capture.title}

- URL: ${capture.url}
- Screenshot: \`${path.relative(path.dirname(result.reportPath), capture.screenshotPath)}\`
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

## Captures

${result.captures
  .map(
    (capture) => `### ${capture.title}

- URL: ${capture.url}
- Screenshot: \`${path.relative(path.dirname(result.reportPath), capture.screenshotPath)}\`
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
- CPU projected refs per tile: ${metrics.cpuProjectedRefsPerTile}
- CPU build duration ms: ${metrics.cpuBuildDurationMs}
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
- Center leak band retention audit: projected ${metrics.retentionAudit.regions.centerLeakBand.projectedTileEntryCount}, current ${metrics.retentionAudit.regions.centerLeakBand.currentRetainedEntryCount}, legacy ${metrics.retentionAudit.regions.centerLeakBand.legacyRetainedEntryCount}; policy added ${metrics.retentionAudit.regions.centerLeakBand.addedByPolicyCount}, dropped ${metrics.retentionAudit.regions.centerLeakBand.droppedByPolicyCount}
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
- Screenshot: \`${path.relative(path.dirname(result.reportPath), capture.screenshotPath)}\`
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

function printSummary(result) {
  console.log(result.classification.summary);
  console.log(`report: ${result.reportPath}`);
  console.log(`screenshot: ${result.screenshotPath}`);
}

function formatMetricRatio(value) {
  return Number.isFinite(value) ? String(value) : "n/a";
}

function printTileLocalComparisonSummary(result) {
  console.log(result.classification.summary.text);
  console.log(`report: ${result.reportPath}`);
  for (const capture of result.captures) {
    console.log(`${capture.id}: ${capture.screenshotPath}`);
  }
}

function printTileLocalDiagnosticsSummary(result) {
  console.log(result.classification.summary.text);
  console.log(`report: ${result.reportPath}`);
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
  --browser-channel <name>        Playwright channel. Defaults to VISUAL_SMOKE_BROWSER_CHANNEL or chrome.
  --browser-executable <path>     Browser executable path; overrides channel.
  --viewport <WIDTHxHEIGHT>       Browser viewport. Defaults to 1280x720.
  --settle-ms <ms>                Wait after canvas sizing before screenshot. Defaults to 1000, or 5000 for tile-local comparison.
  --tile-local-comparison         Capture plate, renderer=tile-local, and renderer=tile-local-visible in one report.
  --tile-local-diagnostics        Capture tile-local-visible diagnostic heatmaps and compact evidence in one report.
  --static-dessert-witness        Capture fixed dessert final color plus tile-local debug evidence in one report.
`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
