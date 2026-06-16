#!/usr/bin/env node
/**
 * Harvest view renderer: captures screenshots from the WebGPU compute rasterizer
 * at multiple camera angles for material segmentation.
 *
 * Usage: node scripts/harvest-views.mjs --url http://localhost:5173/?renderer=compute --out-dir preprocessing/harvest_views
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const HARVEST_CAMERAS = [
  // 6 axis-aligned views
  { azimuth: 0,    elevation: 0,    label: "front" },
  { azimuth: Math.PI, elevation: 0, label: "back" },
  { azimuth: Math.PI / 2, elevation: 0, label: "right" },
  { azimuth: -Math.PI / 2, elevation: 0, label: "left" },
  { azimuth: 0, elevation: 1.2, label: "top" },
  { azimuth: 0, elevation: -0.5, label: "bottom" },
  // 8 diagonal views
  { azimuth: Math.PI / 4,  elevation: 0.4, label: "front-right-up" },
  { azimuth: -Math.PI / 4, elevation: 0.4, label: "front-left-up" },
  { azimuth: Math.PI * 3/4, elevation: 0.4, label: "back-right-up" },
  { azimuth: -Math.PI * 3/4, elevation: 0.4, label: "back-left-up" },
  { azimuth: Math.PI / 4, elevation: -0.2, label: "front-right-low" },
  { azimuth: -Math.PI / 4, elevation: -0.2, label: "front-left-low" },
  { azimuth: Math.PI * 3/4, elevation: -0.2, label: "back-right-low" },
  { azimuth: -Math.PI * 3/4, elevation: -0.2, label: "back-left-low" },
  // 2 extra elevated
  { azimuth: Math.PI / 6, elevation: 0.8, label: "elevated-1" },
  { azimuth: -Math.PI * 2/3, elevation: 0.8, label: "elevated-2" },
];

async function main() {
  const args = process.argv.slice(2);
  let url = "http://localhost:5173/?renderer=compute";
  let outDir = "preprocessing/harvest_views";
  let settleMs = 2000;

  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--url") url = args[++i];
    else if (args[i] === "--out-dir") outDir = args[++i];
    else if (args[i] === "--settle-ms") settleMs = Number(args[++i]);
  }

  outDir = path.resolve(outDir);
  await mkdir(outDir, { recursive: true });

  const { chromium } = await import("playwright-core");
  const browser = await chromium.launch({
    channel: process.env.VISUAL_SMOKE_BROWSER_CHANNEL || "chrome",
    headless: true,
    args: ["--enable-unsafe-webgpu"],
  });

  const context = await browser.newContext({
    viewport: { width: 768, height: 768 },
    deviceScaleFactor: 1,
  });
  const page = await context.newPage();

  console.log(`Loading ${url}...`);
  await page.goto(url, { waitUntil: "networkidle" });

  // Wait for the renderer to be ready
  await page.waitForFunction(() => {
    const smoke = window.__MESH_SPLAT_SMOKE__;
    return smoke && smoke.ready && smoke.splatCount > 0;
  }, { timeout: 30000 });

  // Hide stats overlay
  await page.evaluate(() => {
    const stats = document.getElementById("stats");
    if (stats) stats.style.display = "none";
  });

  // Initial settle
  await page.waitForTimeout(settleMs);

  console.log(`Capturing ${HARVEST_CAMERAS.length} views...`);

  for (let i = 0; i < HARVEST_CAMERAS.length; i++) {
    const cam = HARVEST_CAMERAS[i];

    // Set camera via exposed API
    await page.evaluate(({ azimuth, elevation }) => {
      const setCamera = window.__MESH_SPLAT_SET_CAMERA__;
      if (typeof setCamera === "function") {
        setCamera({ azimuth, elevation });
      }
    }, cam);

    // Wait for render to settle — need at least 2 frames for sort + composite
    await page.waitForTimeout(1000);

    // Capture screenshot
    const filename = `harvest_${String(i).padStart(2, "0")}_${cam.label}.png`;
    const filepath = path.join(outDir, filename);

    // Capture just the canvas
    const canvas = await page.$("canvas");
    if (canvas) {
      const buf = await canvas.screenshot({ type: "png" });
      await writeFile(filepath, buf);
      console.log(`  [${i + 1}/${HARVEST_CAMERAS.length}] ${filename} (az=${cam.azimuth.toFixed(2)} el=${cam.elevation.toFixed(2)})`);
    }
  }

  await browser.close();
  console.log(`Done. ${HARVEST_CAMERAS.length} views saved to ${outDir}/`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
