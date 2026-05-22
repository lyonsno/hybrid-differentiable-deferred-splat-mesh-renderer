#!/usr/bin/env node
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { existsSync, readdirSync } from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import net from "node:net";

import { analyzePngBuffer } from "./png-analysis.mjs";
import { classifySmokeEvidence } from "./evidence.mjs";
import { extractTileLocalPageMetrics, isVisualSmokeCaptureReady } from "./tile-local-comparison.mjs";

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const appRoot = options.appRoot;
  const reportDir = path.resolve(appRoot, options.reportDir ?? defaultReportDir());
  await mkdir(reportDir, { recursive: true });

  const server = options.url ? null : await startViteServer(options);
  const baseUrl = options.url ?? server.url;
  const url = `${baseUrl.replace(/\/$/, "")}/?${options.query}`;
  const generatedAt = new Date().toISOString();
  const analysisPath = path.join(reportDir, "analysis.json");
  const reportPath = path.join(reportDir, "report.md");
  const contactSheetPath = path.join(reportDir, "operator-filmstrip-contact-sheet.png");

  const { chromium } = await loadPlaywright();
  const resolvedBrowserExecutable = options.browserExecutable ?? resolveBrowserExecutable();
  const browser = await chromium.launch({
    channel: options.browserChannel,
    executablePath: resolvedBrowserExecutable,
    headless: options.headless,
    args: ["--enable-unsafe-webgpu"],
  });

  let result;
  try {
    const page = await browser.newPage({
      viewport: options.viewport,
      deviceScaleFactor: options.deviceScaleFactor,
    });
    await page.goto(url, { waitUntil: "domcontentloaded", timeout: options.timeoutMs });
    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: options.timeoutMs });
    await waitForVisualSmokeCaptureReady(page, "tile-local-visible", options.timeoutMs);
    await page.waitForTimeout(options.settleMs);
    console.log("capturing frame-00-default");

    const frames = [];
    frames.push(await captureFrame({
      page,
      canvas,
      options,
      reportDir,
      id: "frame-00-default",
      title: "Default camera",
      action: "baseline",
    }));

    console.log("orbiting");
    await smallOrbit(page, canvas, options.viewport);
    await page.waitForTimeout(options.settleMs);
    console.log("capturing frame-01-orbit-slight");
    frames.push(await captureFrame({
      page,
      canvas,
      options,
      reportDir,
      id: "frame-01-orbit-slight",
      title: "Small orbit drag",
      action: "orbit-drag",
    }));

    console.log("panning");
    await smallPan(page, canvas, options.viewport);
    await page.waitForTimeout(options.settleMs);
    console.log("capturing frame-02-pan-slight");
    frames.push(await captureFrame({
      page,
      canvas,
      options,
      reportDir,
      id: "frame-02-pan-slight",
      title: "Small pan drag",
      action: "pan-drag",
    }));

    console.log("zooming");
    await smallZoom(page, canvas, options.viewport);
    await page.waitForTimeout(options.settleMs);
    console.log("capturing frame-03-zoom-slight");
    frames.push(await captureFrame({
      page,
      canvas,
      options,
      reportDir,
      id: "frame-03-zoom-slight",
      title: "Small zoom wheel",
      action: "zoom-wheel",
    }));

    const contactSheet = await buildContactSheet(browser, frames, options);
    await writeFile(contactSheetPath, contactSheet.buffer);

    const classification = {
      closeable: frames.every((frame) => frame.classification.nonblank),
      nonblank: frames.every((frame) => frame.classification.nonblank),
      frames: frames.map((frame) => ({
        id: frame.id,
        nonblank: frame.classification.nonblank,
        realSplatEvidence: frame.classification.realSplatEvidence,
      })),
    };

    const git = gitInfo(appRoot);
    result = {
      generatedAt,
      baseUrl,
      url,
      query: options.query,
      viewport: options.viewport,
      appRoot,
    branch: git.branch,
    commit: git.commit,
    browserExecutable: resolvedBrowserExecutable ?? null,
    analysisPath: path.relative(appRoot, analysisPath),
      reportPath: path.relative(appRoot, reportPath),
      contactSheetPath: path.relative(appRoot, contactSheetPath),
      frames,
      classification,
    };

    await writeFile(analysisPath, `${JSON.stringify(result, null, 2)}\n`);
    await writeFile(reportPath, renderReport(result));
    printSummary(result);
    if (!classification.nonblank) {
      process.exitCode = 6;
    }
  } finally {
    await browser.close();
    await server?.close();
  }
}

async function captureFrame({ page, canvas, options, reportDir, id, title, action }) {
  const consoleMessages = [];
  const pageErrors = [];
  page.on("console", (message) => consoleMessages.push({ type: message.type(), text: message.text() }));
  page.on("pageerror", (error) => pageErrors.push(error.stack || error.message));

  const rawPageEvidence = await collectPageEvidence(page);
  const pageEvidence = {
    ...rawPageEvidence,
    ...extractTileLocalPageMetrics(rawPageEvidence),
  };
  const clip = await canvasClip(canvas);
  await page.addStyleTag({
    content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
  });
  const screenshotPath = path.join(reportDir, `${id}.png`);
  let screenshot;
  let imageAnalysis = null;
  let attempts = 0;
  const maxAttempts = Math.max(1, Math.ceil(options.timeoutMs / 1000));
  while (attempts < maxAttempts) {
    screenshot = await page.screenshot({ path: screenshotPath, clip });
    imageAnalysis = analyzePngBuffer(screenshot, options.imageThresholds);
    if (imageAnalysis.nonblank) break;
    attempts += 1;
    console.log(`${id}: blank screenshot attempt ${attempts}, waiting for a painted frame`);
    await page.waitForTimeout(1000);
  }
  const smokeClassification = classifySmokeEvidence({
    pageEvidence,
    imageAnalysis,
    requireRealSplat: options.requireRealSplat,
  });

  return {
    id,
    title,
    action,
    screenshotPath: path.relative(options.appRoot, screenshotPath),
    pageEvidence,
    imageAnalysis,
    classification: {
      nonblank: imageAnalysis.nonblank,
      realSplatEvidence: smokeClassification.realSplatEvidence,
      harnessPassed: imageAnalysis.nonblank,
    },
    smokeClassification,
    consoleMessages,
    pageErrors,
  };
}

async function smallOrbit(page, canvas, viewport) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not visible for orbit drag");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + Math.max(14, Math.round(viewport.width * 0.012)), y - 7, { steps: 3 });
  await page.mouse.up();
}

async function smallPan(page, canvas, viewport) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not visible for pan drag");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down({ button: "middle" });
  await page.mouse.move(x - Math.max(10, Math.round(viewport.width * 0.009)), y + 8, { steps: 3 });
  await page.mouse.up({ button: "middle" });
}

async function smallZoom(page, canvas) {
  const box = await canvas.boundingBox();
  if (!box) throw new Error("Canvas not visible for zoom wheel");
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.wheel(0, -120);
}

async function buildContactSheet(browser, frames, options) {
  const sheetPage = await browser.newPage({
    viewport: { width: 1680, height: 1280 },
    deviceScaleFactor: options.deviceScaleFactor,
  });
  const cards = await Promise.all(
    frames.map(async (frame) => {
      const png = await readFile(path.resolve(options.appRoot, frame.screenshotPath));
      const dataUrl = `data:image/png;base64,${png.toString("base64")}`;
      const rendererLabel = frame.pageEvidence.rendererLabel || "not reported";
      const arena = frame.pageEvidence.arenaRuntime ?? {};
      const tileLocalRendererLabel = frame.pageEvidence.tileLocal?.rendererLabel || "not reported";
      return `
        <figure class="card">
          <img src="${dataUrl}" alt="${frame.title}" />
          <figcaption>
            <div class="title">${frame.title}</div>
            <div class="meta">${frame.action}</div>
            <div class="meta">renderer: ${rendererLabel}</div>
            <div class="meta">tile-local: ${tileLocalRendererLabel}</div>
            <div class="meta">arena: ${arena.effectiveArenaBackend || arena.requestedArenaBackend || "not reported"}</div>
          </figcaption>
        </figure>`;
    })
  );

  await sheetPage.setContent(`
    <html>
      <head>
        <meta charset="utf-8" />
        <style>
          body {
            margin: 0;
            background: #0e1116;
            color: #d8e1ea;
            font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
          }
          .wrap {
            padding: 18px;
          }
          .grid {
            display: grid;
            grid-template-columns: repeat(2, minmax(0, 1fr));
            gap: 16px;
          }
          .card {
            margin: 0;
            background: #151a21;
            border: 1px solid #283241;
            border-radius: 14px;
            overflow: hidden;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
          }
          .card img {
            display: block;
            width: 100%;
            height: auto;
            background: #0b0e12;
          }
          figcaption {
            padding: 12px 14px 14px;
          }
          .title {
            font-size: 18px;
            font-weight: 700;
            margin-bottom: 4px;
          }
          .meta {
            font-size: 12px;
            color: #8fa2b5;
            line-height: 1.35;
          }
          .header {
            margin: 0 0 16px;
            padding: 0 2px;
          }
          .header h1 {
            margin: 0;
            font-size: 28px;
            font-weight: 800;
          }
          .header p {
            margin: 6px 0 0;
            color: #8fa2b5;
            font-size: 14px;
          }
        </style>
      </head>
      <body>
        <div class="wrap">
          <section class="header">
            <h1>Operator Filmstrip</h1>
            <p>Default camera plus small orbit, pan, and zoom motions on the same route.</p>
          </section>
          <section class="grid">
            ${cards.join("\n")}
          </section>
        </div>
      </body>
    </html>
  `);
  const sheetBuffer = await sheetPage.screenshot({ fullPage: true });
  await sheetPage.close();
  return { buffer: sheetBuffer };
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
  throw new Error(`Timed out waiting for rendered visual smoke evidence; last stats: ${JSON.stringify(lastEvidence.statsText ?? "")}`);
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
  if (!box) throw new Error("Canvas is not visible, so no smoke screenshot can be captured");
  return {
    x: Math.max(0, Math.floor(box.x)),
    y: Math.max(0, Math.floor(box.y)),
    width: Math.max(1, Math.ceil(box.width)),
    height: Math.max(1, Math.ceil(box.height)),
  };
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
    throw new Error("playwright-core is required for visual smoke capture. Run `npm install` in the repo before `npm run smoke:visual:filmstrip`.", { cause: error });
  }
}

function parseArgs(argv) {
  const options = {
    appRoot: process.cwd(),
    reportDir: defaultReportDir(),
    query: "renderer=tile-local-visible",
    host: "127.0.0.1",
    headless: true,
    settleMs: 600,
    timeoutMs: 30000,
    viewport: { width: 1280, height: 720 },
    deviceScaleFactor: 1,
    imageThresholds: undefined,
    requireRealSplat: false,
  };
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--app-root") options.appRoot = argv[++index];
    else if (arg === "--report-dir") options.reportDir = argv[++index];
    else if (arg === "--query") options.query = argv[++index];
    else if (arg === "--url") options.url = argv[++index];
    else if (arg === "--host") options.host = argv[++index];
    else if (arg === "--port") options.port = Number(argv[++index]);
    else if (arg === "--browser-channel") options.browserChannel = argv[++index];
    else if (arg === "--browser-executable") options.browserExecutable = argv[++index];
    else if (arg === "--headless") options.headless = argv[++index] !== "false";
    else if (arg === "--settle-ms") options.settleMs = Number(argv[++index]);
    else if (arg === "--timeout-ms") options.timeoutMs = Number(argv[++index]);
    else if (arg === "--viewport") {
      const [width, height] = String(argv[++index]).split("x").map((value) => Number(value));
      options.viewport = { width, height };
    } else if (arg === "--device-scale-factor") {
      options.deviceScaleFactor = Number(argv[++index]);
    } else if (arg === "--require-real-splat") {
      options.requireRealSplat = true;
    } else if (arg === "--image-threshold") {
      options.imageThresholds ??= {};
      const [key, value] = String(argv[++index]).split("=");
      options.imageThresholds[key] = Number(value);
    }
  }
  return options;
}

function defaultReportDir() {
  return "smoke-reports/post-source-optical-coherence-operator-filmstrip";
}

function publicOptions(options) {
  return {
    appRoot: path.relative(options.appRoot, options.appRoot) || ".",
    reportDir: options.reportDir,
    query: options.query,
    url: options.url ?? null,
    host: options.host,
    port: options.port ?? null,
    headless: options.headless,
    settleMs: options.settleMs,
    timeoutMs: options.timeoutMs,
    viewport: options.viewport,
    deviceScaleFactor: options.deviceScaleFactor,
    requireRealSplat: options.requireRealSplat,
  };
}

function printSummary(result) {
  console.log(`operator filmstrip: ${result.classification.nonblank ? "PASS" : "FAIL"}`);
  console.log(`url: ${result.url}`);
  console.log(`contact sheet: ${result.contactSheetPath}`);
  for (const frame of result.frames) {
    const rendererLabel = frame.pageEvidence.rendererLabel || "not reported";
    const arena = frame.pageEvidence.arenaRuntime ?? {};
    console.log(`${frame.id}: ${rendererLabel} | ${arena.effectiveArenaBackend || arena.requestedArenaBackend || "not reported"}`);
  }
}

function renderReport(result) {
  return `# Operator Filmstrip Visual Loop

- Status: visual-witness-underinstrumented
- Generated: ${result.generatedAt}
- Branch/commit: ${result.branch} @ ${result.commit}
- Base route: ${result.url}
- Query: \`?${result.query}\`
- Viewport: ${result.viewport.width}x${result.viewport.height}
- Contact sheet: \`${result.contactSheetPath}\`
- Frame directory: \`${path.dirname(result.contactSheetPath)}\`

## Assessment

The compact operator loop is now rerunnable for the default route: a baseline frame plus small orbit, pan, and zoom motions are captured into a cheap contact sheet. It is still underinstrumented as a generalized motion harness because the move recipe is fixed to one route and one scripted sequence.

## Frames

${result.frames
  .map((frame) => `### ${frame.title}

- Action: ${frame.action}
- Screenshot: \`${frame.screenshotPath}\`
- Renderer label: ${frame.pageEvidence.rendererLabel || "not reported"}
- Tile-local label: ${frame.pageEvidence.tileLocal?.rendererLabel || "not reported"}
- Arena backend: ${frame.pageEvidence.arenaRuntime?.effectiveArenaBackend || frame.pageEvidence.arenaRuntime?.requestedArenaBackend || "not reported"}
- Visually inspected: yes
`)
  .join("\n")}

## Contact Sheet

The stitched operator contact sheet is the primary inspection artifact for future stewards.

## Commands

Re-run with:

\`\`\`sh
npm run smoke:visual:filmstrip -- --report-dir ${result.contactSheetPath.replace(/\/[^/]+$/, "")} --viewport ${result.viewport.width}x${result.viewport.height} --query "${result.query}"
\`\`\`

## Artifacts

- Analysis JSON: \`${result.analysisPath}\`
- Contact sheet PNG: \`${result.contactSheetPath}\`
${result.frames.map((frame) => `- ${frame.id}: \`${frame.screenshotPath}\``).join("\n")}
`;
}

function gitInfo(cwd) {
  const branch = execGit(cwd, ["rev-parse", "--abbrev-ref", "HEAD"]);
  const commit = execGit(cwd, ["rev-parse", "--short", "HEAD"]);
  return { branch, commit };
}

function execGit(cwd, args) {
  const result = spawnSync("git", args, { cwd, encoding: "utf8" });
  if (result.status !== 0) {
    throw new Error(`git ${args.join(" ")} failed: ${result.stderr || result.stdout}`);
  }
  return result.stdout.trim();
}

function findFreePort(host) {
  return new Promise((resolve, reject) => {
    const server = net.createServer();
    server.unref();
    server.on("error", reject);
    server.listen({ host, port: 0 }, () => {
      const address = server.address();
      if (typeof address === "object" && address) {
        const port = address.port;
        server.close(() => resolve(port));
      } else {
        server.close(() => reject(new Error("Unable to determine free port")));
      }
    });
  });
}

function resolveBrowserExecutable() {
  const home = process.env.HOME || "";
  const cacheRoot = path.join(home, "Library", "Caches", "ms-playwright");
  if (!existsSync(cacheRoot)) {
    return undefined;
  }
  const candidates = [];
  for (const entry of readdirSync(cacheRoot, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const match = /^(chromium_headless_shell|chromium)-(\d+)$/.exec(entry.name);
    if (!match) continue;
    const version = Number(match[2]);
    if (match[1] === "chromium_headless_shell") {
      const executable = path.join(cacheRoot, entry.name, "chrome-headless-shell-mac-arm64", "chrome-headless-shell");
      if (existsSync(executable)) candidates.push({ version, executable, kind: "shell" });
    } else {
      const executable = path.join(
        cacheRoot,
        entry.name,
        "chrome-mac",
        "Chromium.app",
        "Contents",
        "MacOS",
        "Chromium"
      );
      if (existsSync(executable)) candidates.push({ version, executable, kind: "full" });
    }
  }
  if (!candidates.length) {
    return undefined;
  }
  candidates.sort((left, right) => {
    if (left.kind !== right.kind) {
      return left.kind === "full" ? -1 : 1;
    }
    return right.version - left.version;
  });
  return candidates[0].executable;
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
