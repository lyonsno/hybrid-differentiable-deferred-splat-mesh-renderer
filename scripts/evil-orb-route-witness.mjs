#!/usr/bin/env node
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const DEFAULT_SPLAT = "smoke-assets/evil_orb_final_composite.ply";

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

  const urlSidecarUrl = `${baseUrl}/?splat=${encodeURIComponent(splatPath)}`;
  await page.goto(urlSidecarUrl, { waitUntil: "networkidle" });
  await waitForRoute(page, "url-sidecar");
  await settleView(page, settleMs);
  const urlSidecarEvidence = await captureRoute(page, path.join(outDir, "url-sidecar.png"));

  await dispatchDroppedPly(page, splatPath);
  await waitForRoute(page, "drag-drop-no-sidecar");
  await settleView(page, settleMs);
  const dragDropEvidence = await captureRoute(page, path.join(outDir, "drag-drop-no-sidecar.png"));

  const analysis = {
    witness: "evil-orb-route-witness",
    baseUrl,
    splatPath,
    routes: {
      "url-sidecar": urlSidecarEvidence,
      "drag-drop-no-sidecar": dragDropEvidence,
    },
    consoleMessages,
  };
  const analysisPath = path.join(outDir, "analysis.json");
  await writeFile(analysisPath, JSON.stringify(analysis, null, 2));

  console.log(`Evil Orb route witness wrote ${outDir}`);
  console.log(`- url-sidecar: ${urlSidecarEvidence.routeEvidence.displayCount.toLocaleString()} displayed / ${urlSidecarEvidence.routeEvidence.sourceCount.toLocaleString()} source splats`);
  console.log(`- drag-drop-no-sidecar: ${dragDropEvidence.routeEvidence.displayCount.toLocaleString()} displayed / ${dragDropEvidence.routeEvidence.sourceCount.toLocaleString()} source splats`);
  console.log(`- analysis.json: ${analysisPath}`);

  await browser.close();
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

async function waitForRoute(page, route) {
  await page.waitForFunction((expectedRoute) => {
    const routeEvidence = window.__MESH_SPLAT_ROUTE_EVIDENCE__;
    const smoke = window.__MESH_SPLAT_SMOKE__;
    return Boolean(
      routeEvidence?.route === expectedRoute &&
      smoke?.ready === true &&
      routeEvidence.displayCount > 0
    );
  }, route, { timeout: 120000 });
}

async function settleView(page, settleMs) {
  await page.evaluate(() => {
    const stats = document.getElementById("stats");
    if (stats) stats.style.display = "none";
    const setView = window.__MESH_SPLAT_SET_WITNESS_VIEW__;
    if (typeof setView === "function") setView("default");
  });
  await page.waitForTimeout(settleMs);
}

async function captureRoute(page, screenshotPath) {
  const canvas = await page.$("canvas");
  if (!canvas) throw new Error("No renderer canvas found");
  await writeFile(screenshotPath, await canvas.screenshot({ type: "png" }));
  const pageEvidence = await page.evaluate(() => ({
    smoke: window.__MESH_SPLAT_SMOKE__,
    routeEvidence: window.__MESH_SPLAT_ROUTE_EVIDENCE__,
    cameraState: window.__MESH_SPLAT_CAMERA_STATE__,
    bodyDataset: { ...document.body.dataset },
  }));
  return { ...pageEvidence, screenshotPath };
}

async function dispatchDroppedPly(page, splatPath) {
  await page.evaluate(async (servedSplatPath) => {
    const response = await fetch(servedSplatPath);
    if (!response.ok) throw new Error(`Failed to fetch dropped PLY bytes: ${response.status}`);
    const bytes = await response.arrayBuffer();
    const fileName = servedSplatPath.split("/").pop() || "evil_orb_final_composite.ply";
    const file = new File([bytes], fileName, { type: "application/octet-stream" });
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    window.dispatchEvent(new DragEvent("drop", {
      bubbles: true,
      cancelable: true,
      dataTransfer,
    }));
  }, splatPath);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
