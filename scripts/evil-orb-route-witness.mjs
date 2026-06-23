#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_SPLAT = "/kaminos-assets/splats/inbox/evil_orb_final_composite.ply";

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const baseUrl = args.url ?? "http://localhost:5174";
  const splatPath = args.splat ?? DEFAULT_SPLAT;
  const outDir = path.resolve(args.outDir ?? path.join("smoke-reports", `evil-orb-route-witness-${Date.now()}`));
  const width = Number(args.width ?? 1024);
  const height = Number(args.height ?? 1024);
  const settleMs = Number(args.settleMs ?? 2500);

  await mkdir(outDir, { recursive: true });

  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    channel: process.env.VISUAL_SMOKE_BROWSER_CHANNEL || "chrome",
    headless: true,
    args: ["--enable-unsafe-webgpu"],
  });

  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();
  const consoleMessages = [];
  page.on("console", (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
  page.on("pageerror", (err) => consoleMessages.push({ type: "pageerror", text: err.message }));

  const sidecar = await captureRoute({
    page,
    baseUrl,
    splatPath,
    route: "sidecar",
    noSidecar: false,
    screenshotPath: path.join(outDir, "sidecar.png"),
    settleMs,
  });
  const nosidecar = await captureRoute({
    page,
    baseUrl,
    splatPath,
    route: "nosidecar",
    noSidecar: true,
    screenshotPath: path.join(outDir, "nosidecar.png"),
    settleMs,
  });

  const analysis = {
    witness: "evil-orb-route-witness",
    schema: "gutterglass.evil-orb-route-witness.v1",
    baseUrl,
    splatPath,
    routes: { sidecar, nosidecar },
    counts: {
      sidecar: routeCounts(sidecar),
      nosidecar: routeCounts(nosidecar),
    },
    consoleMessages,
  };
  const analysisPath = path.join(outDir, "analysis.json");
  await writeFile(analysisPath, JSON.stringify(analysis, null, 2));

  console.log(`Evil Orb route witness wrote ${outDir}`);
  console.log(`- sidecar: ${formatCounts(analysis.counts.sidecar)}`);
  console.log(`- nosidecar: ${formatCounts(analysis.counts.nosidecar)}`);
  console.log(`- analysis.json: ${analysisPath}`);

  await browser.close();
}

async function captureRoute({ page, baseUrl, splatPath, route, noSidecar, screenshotPath, settleMs }) {
  const url = buildUrl(baseUrl, splatPath, noSidecar);
  await page.goto(url, { waitUntil: "networkidle" });
  await waitForLoadedRoute(page, { noSidecar });
  await settleView(page, settleMs);
  const canvas = await page.$("canvas");
  if (!canvas) throw new Error(`No renderer canvas found for ${route}`);
  await writeFile(screenshotPath, await canvas.screenshot({ type: "png" }));
  const pageEvidence = await page.evaluate(() => ({
    smoke: window.__MESH_SPLAT_SMOKE__,
    witness: window.__MESH_SPLAT_WITNESS__,
    sidecarLoadLog: window.__MESH_SPLAT_SIDECAR_LOAD_LOG__,
    cameraState: window.__MESH_SPLAT_CAMERA_STATE__,
    bodyDataset: { ...document.body.dataset },
  }));
  return { route, url, screenshotPath, ...pageEvidence };
}

function buildUrl(baseUrl, splatPath, noSidecar) {
  const url = new URL(baseUrl);
  url.searchParams.set("splat", splatPath);
  if (noSidecar) url.searchParams.set("nosidecar", "");
  return url.toString();
}

async function waitForLoadedRoute(page, { noSidecar }) {
  await page.waitForFunction((expectedNoSidecar) => {
    const smoke = window.__MESH_SPLAT_SMOKE__;
    const sidecarLoadLog = window.__MESH_SPLAT_SIDECAR_LOAD_LOG__;
    return Boolean(
      smoke?.ready === true &&
      smoke.splatCount > 0 &&
      sidecarLoadLog &&
      sidecarLoadLog.sidecarSkippedByNosidecar === expectedNoSidecar &&
      sidecarLoadLog.postCropCount === smoke.splatCount
    );
  }, noSidecar, { timeout: 120000 });
}

async function settleView(page, settleMs) {
  await page.evaluate(() => {
    for (const el of document.querySelectorAll("#controls, #stats")) {
      el.style.display = "none";
    }
    const setView = window.__MESH_SPLAT_SET_WITNESS_VIEW__;
    if (typeof setView === "function") setView("default");
  });
  await page.waitForTimeout(settleMs);
}

function routeCounts(route) {
  return {
    rawSplatCount: Number(route.sidecarLoadLog?.rawSplatCount ?? 0),
    postCropCount: Number(route.sidecarLoadLog?.postCropCount ?? 0),
    smokeSplatCount: Number(route.smoke?.splatCount ?? 0),
    sidecarFound: route.sidecarLoadLog?.sidecarFound === true,
    sidecarSkippedByNosidecar: route.sidecarLoadLog?.sidecarSkippedByNosidecar === true,
  };
}

function formatCounts(counts) {
  const source = counts.rawSplatCount.toLocaleString();
  const displayed = counts.postCropCount.toLocaleString();
  const found = counts.sidecarFound ? "sidecar found" : "sidecar not applied";
  return `${displayed} displayed / ${source} source splats (${found})`;
}

function parseArgs(args) {
  const parsed = {};
  for (let index = 0; index < args.length; index += 1) {
    const key = args[index];
    switch (key) {
      case "--url":
        parsed.url = args[++index];
        break;
      case "--splat":
        parsed.splat = args[++index];
        break;
      case "--out-dir":
        parsed.outDir = args[++index];
        break;
      case "--width":
        parsed.width = args[++index];
        break;
      case "--height":
        parsed.height = args[++index];
        break;
      case "--settle-ms":
        parsed.settleMs = args[++index];
        break;
      case "--help":
      case "-h":
        console.log("Usage: evil-orb-route-witness.mjs [--url <dev-server>] [--splat <served-ply>] [--out-dir <dir>]");
        process.exit(0);
      default:
        throw new Error(`Unknown argument: ${key}`);
    }
  }
  return parsed;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
