#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { analyzePngBuffer } from "./png-analysis.mjs";
import { classifySmokeEvidence } from "./evidence.mjs";
import { classifyWitnessCapture } from "./witness-diagnostics.mjs";
import {
  extractTileLocalPageMetrics,
  isVisualSmokeCaptureReady,
} from "./tile-local-comparison.mjs";

const OPERATOR_FILMSTRIP_CAPTURE_IDS = {
  defaultCamera: "default-camera",
  orbitLeft: "orbit-left",
  orbitRight: "orbit-right",
  zoomIn: "zoom-in",
  strafeRight: "strafe-right",
};

export function buildOperatorFilmstripPlan(baseUrl) {
  const visibleRoute = rendererUrl(baseUrl, "tile-local-visible");
  return [
    {
      id: OPERATOR_FILMSTRIP_CAPTURE_IDS.defaultCamera,
      title: "Default camera",
      expectedRendererLabel: "tile-local-visible",
      url: visibleRoute,
      gesture: { kind: "none" },
    },
    {
      id: OPERATOR_FILMSTRIP_CAPTURE_IDS.orbitLeft,
      title: "Small orbit left",
      expectedRendererLabel: "tile-local-visible",
      url: visibleRoute,
      gesture: { kind: "drag", dx: -22, dy: 0 },
    },
    {
      id: OPERATOR_FILMSTRIP_CAPTURE_IDS.zoomIn,
      title: "Small zoom in",
      expectedRendererLabel: "tile-local-visible",
      url: visibleRoute,
      gesture: { kind: "wheel", deltaY: -60 },
    },
  ];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const reportDir = path.resolve(options.appRoot, options.reportDir ?? defaultReportDir());
  await mkdir(reportDir, { recursive: true });

  const server = options.url ? null : await startViteServer(options);
  const baseUrl = options.url ?? server.url;
  const generatedAt = new Date().toISOString();
  const gitInfo = await readGitInfo(options.appRoot);

  const browser = await loadBrowser(options);
  const captures = [];
  try {
    const plan = buildOperatorFilmstripPlan(baseUrl);
    for (const capture of plan) {
      captures.push(await captureFilmstripFrame({ browser, options, capture, reportDir }));
    }

    const analysis = {
      generatedAt,
      baseUrl,
      options: publicOptions(options),
      gitInfo,
      plan,
      captures,
      classification: classifyOperatorFilmstrip(captures),
    };

    const analysisPath = path.join(reportDir, "analysis.json");
    const reportPath = path.join(reportDir, "report.md");
    const contactSheetHtmlPath = path.join(reportDir, "contact-sheet.html");
    const contactSheetPngPath = path.join(reportDir, "contact-sheet.png");

    await writeFile(analysisPath, `${JSON.stringify(analysis, null, 2)}\n`);
    await writeFile(contactSheetHtmlPath, renderContactSheetHtml(analysis));
    await renderContactSheetScreenshot(browser, contactSheetHtmlPath, contactSheetPngPath);
    await writeFile(reportPath, renderOperatorFilmstripReport({
      ...analysis,
      analysisPath: path.relative(options.appRoot, analysisPath),
      reportPath: path.relative(options.appRoot, reportPath),
      contactSheetHtmlPath: path.relative(options.appRoot, contactSheetHtmlPath),
      contactSheetPngPath: path.relative(options.appRoot, contactSheetPngPath),
    }));

    printSummary({
      ...analysis,
      reportPath: path.relative(options.appRoot, reportPath),
      contactSheetPngPath: path.relative(options.appRoot, contactSheetPngPath),
    });

    if (!analysis.classification.closeable) {
      process.exitCode = 6;
    }
  } finally {
    await browser.close();
    await server?.close();
  }
}

async function captureFilmstripFrame({ browser, options, capture, reportDir }) {
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
    if (capture.gesture.kind !== "none") {
      await applyGesture(page, canvas, capture.gesture);
    }
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

async function applyGesture(page, canvas, gesture) {
  const box = await canvas.boundingBox();
  if (!box) {
    throw new Error("Canvas is not visible, so a filmstrip gesture cannot be applied");
  }
  const centerX = Math.max(1, Math.floor(box.x + box.width / 2));
  const centerY = Math.max(1, Math.floor(box.y + box.height / 2));

  switch (gesture.kind) {
    case "drag": {
      await page.mouse.move(centerX, centerY);
      await page.mouse.down();
      await page.mouse.move(centerX + gesture.dx, centerY + gesture.dy, { steps: 6 });
      await page.mouse.up();
      return;
    }
    case "wheel": {
      await page.mouse.move(centerX, centerY);
      await page.mouse.wheel(0, gesture.deltaY);
      return;
    }
    case "keyboard": {
      await page.keyboard.down(gesture.key);
      await page.waitForTimeout(gesture.holdMs ?? 200);
      await page.keyboard.up(gesture.key);
      return;
    }
    default:
      return;
  }
}

async function renderContactSheetScreenshot(browser, htmlPath, screenshotPath) {
  const page = await browser.newPage({ viewport: { width: 1680, height: 1800 }, deviceScaleFactor: 1 });
  try {
    await page.goto(pathToFileURL(htmlPath).href, { waitUntil: "load" });
    await page.evaluate(async () => {
      await Promise.all(Array.from(document.images, (image) => {
        if (image.complete) return Promise.resolve();
        return new Promise((resolve) => {
          image.addEventListener("load", resolve, { once: true });
          image.addEventListener("error", resolve, { once: true });
        });
      }));
    });
    await page.screenshot({ path: screenshotPath, fullPage: true });
  } finally {
    await page.close();
  }
}

async function readGitInfo(appRoot) {
  const { execFile } = await import("node:child_process");
  const { promisify } = await import("node:util");
  const execFileAsync = promisify(execFile);
  const [branch, commit] = await Promise.all([
    execFileAsync("git", ["-C", appRoot, "rev-parse", "--abbrev-ref", "HEAD"]).then((result) => result.stdout.trim()),
    execFileAsync("git", ["-C", appRoot, "rev-parse", "HEAD"]).then((result) => result.stdout.trim()),
  ]);
  return { branch, commit };
}

async function loadBrowser(options) {
  const { chromium } = await loadPlaywright();
  return chromium.launch({
    channel: options.browserChannel,
    executablePath: options.browserExecutable,
    headless: options.headless,
    args: ["--enable-unsafe-webgpu"],
  });
}

async function loadPlaywright() {
  try {
    return await import("playwright-core");
  } catch (error) {
    throw new Error("playwright-core is required for operator filmstrip capture. Run `npm install` in the repo first.", {
      cause: error,
    });
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
    `Timed out waiting for rendered visual smoke evidence (${expectedRendererLabel}); last stats: ${JSON.stringify(lastEvidence.statsText ?? "")}`
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
      arenaBackend: smoke.arenaBackend ?? firstDatasetValue("arenaBackend", "smokeArenaBackend"),
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

function renderContactSheetHtml(result) {
  const items = result.captures
    .map(
      (capture) => `<figure>
  <img src="${path.basename(capture.screenshotPath)}" alt="${escapeHtml(capture.title)}">
  <figcaption>
    <div class="title">${escapeHtml(capture.title)}</div>
    <div class="meta">${escapeHtml(capture.gesture.kind)} | ${escapeHtml(capture.pageEvidence.rendererLabel || "not reported")}</div>
    <div class="meta">${escapeHtml(capture.pageEvidence.arenaBackend || "not reported")} / ${escapeHtml(capture.pageEvidence.sortBackend || "not reported")}</div>
  </figcaption>
</figure>`
    )
    .join("\n");

  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <title>Operator Filmstrip Contact Sheet</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #0f1115;
        --panel: #171b22;
        --ink: #e7edf8;
        --muted: #9fb0c7;
        --accent: #7bc3ff;
        --border: rgba(255, 255, 255, 0.12);
      }
      html, body {
        margin: 0;
        padding: 0;
        background: radial-gradient(circle at top, #1a2030 0%, var(--bg) 58%);
        color: var(--ink);
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      }
      body {
        padding: 24px;
      }
      .shell {
        max-width: 1680px;
        margin: 0 auto;
      }
      .meta {
        color: var(--muted);
        font-size: 13px;
        line-height: 1.35;
      }
      h1 {
        margin: 0 0 6px;
        font-size: 28px;
      }
      .lede {
        margin: 0 0 18px;
        max-width: 1100px;
      }
      .grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(420px, 1fr));
        gap: 16px;
      }
      figure {
        margin: 0;
        padding: 12px;
        background: rgba(23, 27, 34, 0.88);
        border: 1px solid var(--border);
        border-radius: 16px;
        box-shadow: 0 20px 60px rgba(0, 0, 0, 0.28);
      }
      img {
        width: 100%;
        height: auto;
        display: block;
        border-radius: 10px;
        background: #000;
      }
      figcaption {
        margin-top: 10px;
      }
      .title {
        color: var(--ink);
        font-weight: 700;
        margin-bottom: 4px;
      }
      .meta {
        margin-top: 2px;
      }
      code {
        background: rgba(255, 255, 255, 0.08);
        padding: 0 4px;
        border-radius: 4px;
      }
    </style>
  </head>
  <body>
    <div class="shell">
      <h1>Operator Filmstrip</h1>
      <p class="lede meta">
        Route <code>${escapeHtml(result.baseUrl)}</code> | viewport <code>${escapeHtml(formatViewport(result.options.viewport))}</code> |
        branch <code>${escapeHtml(result.gitInfo.branch)}</code> @ <code>${escapeHtml(result.gitInfo.commit.slice(0, 7))}</code> |
        renderer <code>tile-local-visible</code>
      </p>
      <div class="grid">
        ${items}
      </div>
    </div>
  </body>
</html>`;
}

function renderOperatorFilmstripReport(result) {
  const verdict = result.classification.closeable ? "operator-filmstrip-loop-seated" : "operator-filmstrip-underinstrumented";
  return `# Operator Filmstrip Visual Loop

- Status: ${verdict}
- Generated: ${result.generatedAt}
- Route: ${result.baseUrl}
- Viewport: ${formatViewport(result.options.viewport)}
- Branch/commit: ${result.gitInfo.branch} @ ${result.gitInfo.commit}
- Report artifacts: \`${result.reportPath}\`, \`${result.contactSheetHtmlPath}\`, \`${result.contactSheetPngPath}\`
- Analysis JSON: \`${result.analysisPath}\`

## Summary

This report captures a compact camera-motion loop under the default route and small control variations, so stewards can inspect what the human sees without treating a single static receipt as the whole story.

## Frames

${result.captures
  .map(
    (capture) => `### ${capture.title}

- Capture ID: ${capture.id}
- Gesture: ${gestureSummary(capture.gesture)}
- URL: ${capture.url}
- Screenshot: \`${capture.screenshotPath}\`
- Renderer label: ${capture.pageEvidence.rendererLabel || "not reported"}
- Arena backend: ${capture.pageEvidence.arenaBackend || "not reported"}
- Sort backend: ${capture.pageEvidence.sortBackend || "not reported"}
- Viewport: ${viewportKey(capture)}
- Real splat evidence: ${capture.classification.realSplatEvidence}
- Nonblank: ${capture.classification.nonblank}
- Changed pixels: ${capture.imageAnalysis.changedPixels} / ${capture.imageAnalysis.totalPixels} (${formatPercent(capture.imageAnalysis.changedPixelRatio)})
- Distinct colors: ${capture.imageAnalysis.distinctColorCount}
- Witness findings: ${capture.witnessDiagnostics.findings.length}
`
  )
  .join("\n")}

## Verdict

${result.classification.closeable
    ? "This now gives us a regular visual loop: a rerunnable filmstrip plan, screenshot set, contact-sheet artifact, and markdown report are all seated."
    : `This is still underinstrumented: ${result.classification.summary}. The missing slice is the first failing frame or missing capture detail listed in the analysis JSON.`}
`;
}

function classifyOperatorFilmstrip(captures) {
  const findings = [];
  for (const capture of captures) {
    if (!capture.classification?.harnessPassed) {
      findings.push({ kind: "frame-smoke-failed", summary: `${capture.id} did not pass the smoke harness.` });
    }
    if (!capture.classification?.realSplatEvidence) {
      findings.push({ kind: "missing-real-splat-evidence", summary: `${capture.id} did not report real Scaniverse splat evidence.` });
    }
  }
  return {
    closeable: findings.length === 0,
    summary: findings.length === 0 ? "PASS" : `FAIL: ${findings[0].summary}`,
    findings,
  };
}

function gestureSummary(gesture) {
  switch (gesture.kind) {
    case "none":
      return "no motion";
    case "drag":
      return `drag dx=${gesture.dx} dy=${gesture.dy}`;
    case "wheel":
      return `wheel deltaY=${gesture.deltaY}`;
    case "keyboard":
      return `key ${gesture.key} hold ${gesture.holdMs ?? 200}ms`;
    default:
      return gesture.kind;
  }
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
  };
}

function parseArgs(args) {
  const options = {
    appRoot: process.cwd(),
    host: "127.0.0.1",
    port: undefined,
    url: undefined,
    reportDir: undefined,
    requireRealSplat: true,
    headless: true,
    browserChannel: process.env.VISUAL_SMOKE_BROWSER_CHANNEL || "chrome",
    browserExecutable: process.env.VISUAL_SMOKE_BROWSER_EXECUTABLE,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    timeoutMs: 30000,
    settleMs: 2500,
    imageThresholds: {},
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
      case "--no-require-real-splat":
        options.requireRealSplat = false;
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

function rendererUrl(baseUrl, renderer) {
  const url = new URL(baseUrl);
  if (renderer) {
    url.searchParams.set("renderer", renderer);
  } else {
    url.searchParams.delete("renderer");
  }
  return url.toString().replaceAll("%2F", "/");
}

function parseViewport(value) {
  const match = /^(\d+)x(\d+)$/i.exec(value);
  if (!match) {
    throw new Error(`Invalid viewport ${value}; expected WIDTHxHEIGHT`);
  }
  return { width: Number(match[1]), height: Number(match[2]) };
}

function formatViewport(viewport) {
  return `${viewport.width}x${viewport.height}`;
}

function viewportKey(capture = {}) {
  const canvas = capture.pageEvidence?.canvas ?? {};
  return `${canvas.width || 0}x${canvas.height || 0}`;
}

function formatPercent(value) {
  return `${(value * 100).toFixed(3)}%`;
}

function defaultReportDir() {
  return path.join("smoke-reports", `operator-filmstrip-${new Date().toISOString().replace(/[:.]/g, "-")}`);
}

function printSummary(result) {
  console.log(result.classification.closeable ? "PASS: operator filmstrip loop seated." : "FAIL: operator filmstrip loop underinstrumented.");
  console.log(`report: ${result.reportPath}`);
  console.log(`contact sheet: ${result.contactSheetPngPath}`);
  for (const capture of result.captures) {
    console.log(`${capture.id}: ${capture.screenshotPath}`);
  }
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll("\"", "&quot;")
    .replaceAll("'", "&#39;");
}

function printHelp() {
  console.log(`Usage: node scripts/visual-smoke/operator-filmstrip.mjs [options]

Options:
  --url <url>                     Capture an already-running app instead of launching Vite.
  --app-root <path>               Repo root to launch with Vite. Defaults to cwd.
  --report-dir, --out-dir <path>  Output directory. Defaults to smoke-reports/operator-filmstrip-<timestamp>.
  --no-require-real-splat         Allow synthetic or stubbed splat evidence.
  --browser-channel <name>        Playwright channel. Defaults to VISUAL_SMOKE_BROWSER_CHANNEL or chrome.
  --browser-executable <path>     Browser executable path; overrides channel.
  --viewport <WIDTHxHEIGHT>      Browser viewport. Defaults to 1280x720.
  --settle-ms <ms>               Wait after each gesture before screenshot. Defaults to 2500.
`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
