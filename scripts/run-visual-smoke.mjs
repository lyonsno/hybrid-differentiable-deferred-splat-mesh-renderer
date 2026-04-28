#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import net from "node:net";
import path from "node:path";

import { classifySmokeEvidence } from "./visual-smoke/evidence.mjs";
import { analyzePngBuffer } from "./visual-smoke/png-analysis.mjs";

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

    const page = await browser.newPage({
      viewport: options.viewport,
      deviceScaleFactor: options.deviceScaleFactor,
    });
    page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
    page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: options.timeoutMs });
    await page.waitForFunction(
      () => {
        const target = document.querySelector("canvas");
        return Boolean(target && target.width > 0 && target.height > 0);
      },
      null,
      { timeout: options.timeoutMs }
    );
    await page.waitForTimeout(options.settleMs);

    const pageEvidence = await collectPageEvidence(page);
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

async function collectPageEvidence(page) {
  return page.evaluate(() => {
    const canvas = document.querySelector("canvas");
    const stats = document.querySelector("#stats");
    const smoke = globalThis.__MESH_SPLAT_SMOKE__ && typeof globalThis.__MESH_SPLAT_SMOKE__ === "object"
      ? globalThis.__MESH_SPLAT_SMOKE__
      : {};
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
      ready: smoke.ready ?? firstDatasetValue("smokeReady", "ready"),
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
- Summary: ${classification.summary}

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

function printSummary(result) {
  console.log(result.classification.summary);
  console.log(`report: ${result.reportPath}`);
  console.log(`screenshot: ${result.screenshotPath}`);
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
  --settle-ms <ms>                Wait after canvas sizing before screenshot. Defaults to 1000.
`);
}

main().catch((error) => {
  console.error(error.stack || error.message);
  process.exit(1);
});
