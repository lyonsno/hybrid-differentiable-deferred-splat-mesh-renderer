#!/usr/bin/env node
/**
 * Render a splat PLY to a screenshot from the default camera view.
 *
 * Launches the renderer headless via Playwright, loads the specified PLY,
 * waits for the scene to settle, and saves a canvas screenshot as PNG.
 *
 * Usage:
 *   # With a running dev server:
 *   node scripts/render-splat-screenshot.mjs --splat path/to/file.ply --output screenshot.png
 *
 *   # With custom server URL:
 *   node scripts/render-splat-screenshot.mjs --splat path/to/file.ply --output screenshot.png --url http://localhost:5174
 *
 *   # With custom viewport and settle time:
 *   node scripts/render-splat-screenshot.mjs --splat path/to/file.ply --output screenshot.png --width 1024 --height 768 --settle-ms 3000
 *
 *   # Specific camera angle:
 *   node scripts/render-splat-screenshot.mjs --splat path/to/file.ply --output screenshot.png --azimuth 0.5 --elevation 0.3
 *
 * The renderer must be running (e.g. `npm run dev`), or use --url to point at it.
 * The splat path is passed as a URL parameter and must be accessible to the dev server.
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

async function main() {
  const args = process.argv.slice(2);
  let splatPath = null;
  let outputPath = "screenshot.png";
  let baseUrl = "http://localhost:5174";
  let width = 1024;
  let height = 768;
  let settleMs = 2000;
  let azimuth = null;
  let elevation = null;
  let distance = null;

  for (let i = 0; i < args.length; i++) {
    switch (args[i]) {
      case "--splat": splatPath = args[++i]; break;
      case "--output": case "-o": outputPath = args[++i]; break;
      case "--url": baseUrl = args[++i]; break;
      case "--width": width = Number(args[++i]); break;
      case "--height": height = Number(args[++i]); break;
      case "--settle-ms": settleMs = Number(args[++i]); break;
      case "--azimuth": azimuth = Number(args[++i]); break;
      case "--elevation": elevation = Number(args[++i]); break;
      case "--distance": distance = Number(args[++i]); break;
      case "--help": case "-h":
        console.log("Usage: render-splat-screenshot.mjs --splat <path> --output <path> [options]");
        console.log("Options: --url, --width, --height, --settle-ms, --azimuth, --elevation, --distance");
        process.exit(0);
    }
  }

  if (!splatPath) {
    console.error("Error: --splat <path> is required");
    process.exit(1);
  }

  // Build renderer URL with splat param
  const url = `${baseUrl}/?splat=${encodeURIComponent(splatPath)}`;

  // Ensure output directory exists
  const outputDir = path.dirname(path.resolve(outputPath));
  await mkdir(outputDir, { recursive: true });

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

  // Collect console messages for diagnostics
  const messages = [];
  page.on("console", (msg) => messages.push(`[${msg.type()}] ${msg.text()}`));
  page.on("pageerror", (err) => messages.push(`[page-error] ${err.message}`));

  console.log(`Loading renderer: ${url}`);
  console.log(`Viewport: ${width}x${height}, settle: ${settleMs}ms`);

  await page.goto(url, { waitUntil: "networkidle" });

  // Wait for the renderer to report ready with splats loaded.
  // Try __MESH_SPLAT_SMOKE__ first, fall back to body dataset attribute
  // which is set by exposeMeshSplatSmokeEvidence.
  try {
    await page.waitForFunction(() => {
      const smoke = window.__MESH_SPLAT_SMOKE__;
      if (smoke && smoke.ready && smoke.splatCount > 0) return true;
      // Fallback: check body dataset set by exposeMeshSplatSmokeEvidence
      const count = document.body.dataset.smokeSplatCount;
      return count && Number(count) > 0;
    }, { timeout: 60000 });
  } catch (e) {
    console.error("Timeout waiting for renderer to load splats");
    console.error("Console output:", messages.slice(-10).join("\n"));
    await browser.close();
    process.exit(2);
  }

  // Hide stats overlay
  await page.evaluate(() => {
    const stats = document.getElementById("stats");
    if (stats) stats.style.display = "none";
  });

  // Set camera if specified, otherwise try to use the witness view API
  // to frame the scene properly
  if (azimuth !== null || elevation !== null || distance !== null) {
    await page.evaluate(({ azimuth, elevation, distance }) => {
      const setCamera = window.__MESH_SPLAT_SET_CAMERA__;
      if (typeof setCamera === "function") {
        const params = {};
        if (azimuth !== null) params.azimuth = azimuth;
        if (elevation !== null) params.elevation = elevation;
        if (distance !== null) params.distance = distance;
        setCamera(params);
      }
    }, { azimuth, elevation, distance });
  } else {
    // Try the witness view API to get a default framing
    await page.evaluate(() => {
      const setView = window.__MESH_SPLAT_SET_WITNESS_VIEW__;
      if (typeof setView === "function") {
        setView("default");
      }
    });
  }

  // Request a few extra render frames to ensure sort + composite complete
  await page.evaluate(() => {
    // Trigger multiple animation frames
    for (let i = 0; i < 5; i++) {
      requestAnimationFrame(() => {});
    }
  });

  // Wait for render to settle (sort + composite need at least 2 frames)
  await page.waitForTimeout(settleMs);

  // Get splat count for logging
  const splatCount = await page.evaluate(() => {
    const smoke = window.__MESH_SPLAT_SMOKE__;
    if (smoke && smoke.splatCount > 0) return smoke.splatCount;
    return Number(document.body.dataset.smokeSplatCount || 0);
  });

  // Capture canvas screenshot
  const canvas = await page.$("canvas");
  if (!canvas) {
    console.error("No canvas element found");
    await browser.close();
    process.exit(3);
  }

  const buf = await canvas.screenshot({ type: "png" });
  await writeFile(path.resolve(outputPath), buf);

  // Save camera state for the baking pipeline
  const cameraState = await page.evaluate(() => window.__MESH_SPLAT_CAMERA_STATE__);
  if (cameraState) {
    const cameraPath = path.resolve(outputPath).replace(/\.png$/i, ".camera.json");
    await writeFile(cameraPath, JSON.stringify(cameraState, null, 2));
    console.log(`Camera: ${cameraPath}`);
  }

  console.log(`Captured: ${outputPath} (${splatCount.toLocaleString()} splats, ${width}x${height})`);

  // Print console messages for diagnostics
  if (messages.length > 0) {
    console.log(`\nBrowser console (${messages.length} messages):`);
    for (const msg of messages) {
      console.log(`  ${msg}`);
    }
  }

  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
