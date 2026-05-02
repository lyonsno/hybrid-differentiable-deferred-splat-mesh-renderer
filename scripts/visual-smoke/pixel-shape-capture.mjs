/**
 * pixel-shape-capture.mjs
 *
 * Browser/WebGPU pixel capture surface for the renderer-pixel-harness lane of the
 * pixel-witness-shape-guillotine coordination packet.
 *
 * Owns:
 * - Playwright/browser launch for shape-witness captures
 * - Deterministic fixture URL/query shape (?synthetic=shape-witness-<type>)
 * - Screenshot/canvas capture at 512x512 viewport
 * - Output paths for captured PNGs
 * - The isShapeWithinRibbonThicknessBound predicate (geometric gate helper)
 * - The captureShapeWitness(fixtureId, options?) API
 *
 * Does NOT own:
 * - Synthetic fixture data/semantics (synthetic-shape-fixtures lane)
 * - Full pixel geometry analysis utilities (pixel-geometry-assertions lane)
 * - Production projection math fixes
 * - Alpha/compositor fixes or near-plane policy fixes
 * - Beauty/parity thresholds
 *
 * Renderer-path stub:
 * If the renderer does not yet handle ?synthetic=shape-witness-<id>, the capture
 * will succeed (the page loads) but will log a warning in the returned metadata.
 * The renderer-path-integration lane is responsible for wiring real fixture loading.
 * See: docs/renderer-fidelity/pixel-shape-harness-renderer-stub.md
 */

import { decodePng } from "./png-analysis.mjs";

// ---------------------------------------------------------------------------
// Metadata handshake constants (shared with sibling lanes via coordination packet)
// ---------------------------------------------------------------------------

/**
 * All canonical fixture IDs defined in the metadata handshake.
 * Source: meshsplat-renderer-pixel-shape-truth_2026-05-02.md
 */
export const SHAPE_WITNESS_FIXTURE_IDS = Object.freeze([
  "isotropic-circle",
  "edge-on-ribbon",
  "rotated-ellipse",
  "near-plane-slab",
  "dense-foreground",
]);

/**
 * Capture viewport for shape-witness captures.
 * Source: metadata handshake in coordination packet.
 */
export const SHAPE_WITNESS_CAPTURE_VIEWPORT = Object.freeze({ width: 512, height: 512 });

/**
 * Expected renderer label that main.ts should expose when serving a
 * shape-witness synthetic fixture. The renderer-path-integration lane wires this;
 * we check for it as a readiness signal during capture.
 */
export const SHAPE_WITNESS_RENDERER_LABEL = "shape-witness";

// Default settle time after page loads before capturing screenshot.
const DEFAULT_SETTLE_MS = 2000;
// Default maximum time to wait for the renderer to be ready.
const DEFAULT_TIMEOUT_MS = 20_000;
// Default browser channel.
const DEFAULT_BROWSER_CHANNEL = process.env.VISUAL_SMOKE_BROWSER_CHANNEL || "chrome";

// ---------------------------------------------------------------------------
// URL construction
// ---------------------------------------------------------------------------

/**
 * Builds the deterministic URL for a shape-witness fixture capture.
 *
 * Query shape: ?synthetic=shape-witness-<fixtureId>
 *
 * @param {string} baseUrl - Base URL of the running renderer (e.g. http://localhost:5173)
 * @param {string} fixtureId - One of SHAPE_WITNESS_FIXTURE_IDS
 * @returns {string} Full URL with query string
 * @throws {Error} If fixtureId is not in SHAPE_WITNESS_FIXTURE_IDS
 */
export function buildShapeWitnessUrl(baseUrl, fixtureId) {
  if (!SHAPE_WITNESS_FIXTURE_IDS.includes(fixtureId)) {
    throw new Error(
      `Unrecognized fixture ID: "${fixtureId}". Valid IDs: ${SHAPE_WITNESS_FIXTURE_IDS.join(", ")}`
    );
  }
  const url = new URL(baseUrl);
  url.searchParams.set("synthetic", `shape-witness-${fixtureId}`);
  return url.toString();
}

// ---------------------------------------------------------------------------
// Geometric gate predicate
//
// This is a minimal shape discriminator: measures the bounding extent of
// changed pixels along the Y axis (vertical thickness) and checks it is within
// a fraction of the frame height. Used to prove the old nonblank smoke is blind
// to fat-blob vs thin-ribbon distinctions.
//
// The pixel-geometry-assertions lane owns the full geometric analysis suite
// (masks, centroids, principal axes, thickness ratios). This predicate is the
// minimal harness-owned gate to satisfy acceptance criterion 1.
// ---------------------------------------------------------------------------

/**
 * Returns true if the occupied (changed) pixel region in the PNG is thin enough
 * to be plausibly an edge-on ribbon, false if it is too thick (e.g. a fat blob).
 *
 * Measurement: the vertical bounding extent of all changed pixels divided by
 * frame height. An edge-on ribbon should produce a very thin vertical extent;
 * a fat isotropic blob or misprojected splat will produce a tall extent.
 *
 * @param {Buffer} pngBuffer - PNG image buffer
 * @param {object} [options]
 * @param {number} [options.maxThicknessFraction=0.10] - Maximum allowed vertical extent / height
 * @param {number} [options.pixelDeltaThreshold=20] - Per-channel delta to count a pixel as changed
 * @returns {boolean} true if shape is within ribbon thickness bound
 */
export function isShapeWithinRibbonThicknessBound(pngBuffer, options = {}) {
  const { maxThicknessFraction = 0.10, pixelDeltaThreshold = 20 } = options;

  const image = decodePng(pngBuffer);
  const { width, height, rgba } = image;

  // Estimate background from corners (same approach as analyzePngBuffer).
  const corners = [
    readPixelRgba(rgba, width, 0, 0),
    readPixelRgba(rgba, width, width - 1, 0),
    readPixelRgba(rgba, width, 0, height - 1),
    readPixelRgba(rgba, width, width - 1, height - 1),
  ];
  const background = [0, 1, 2, 3].map((ch) =>
    Math.round(corners.reduce((sum, px) => sum + px[ch], 0) / corners.length)
  );

  // Find vertical extent of changed pixels.
  let minChangedRow = height;
  let maxChangedRow = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const px = readPixelRgba(rgba, width, x, y);
      const delta = (
        Math.abs(px[0] - background[0]) +
        Math.abs(px[1] - background[1]) +
        Math.abs(px[2] - background[2])
      ) / 3;
      if (delta >= pixelDeltaThreshold) {
        if (y < minChangedRow) minChangedRow = y;
        if (y > maxChangedRow) maxChangedRow = y;
        break; // Only need to find if this row has any changed pixels.
      }
    }
  }

  if (maxChangedRow < minChangedRow) {
    // No changed pixels found — treat as within bound (blank image is not "too fat").
    return true;
  }

  const verticalExtent = maxChangedRow - minChangedRow + 1;
  const thicknessFraction = verticalExtent / height;
  return thicknessFraction <= maxThicknessFraction;
}

function readPixelRgba(rgba, width, x, y) {
  const offset = (y * width + x) * 4;
  return [rgba[offset], rgba[offset + 1], rgba[offset + 2], rgba[offset + 3]];
}

// ---------------------------------------------------------------------------
// Main capture API
// ---------------------------------------------------------------------------

/**
 * Captures a shape-witness screenshot from the real browser/WebGPU renderer.
 *
 * The renderer must be reachable at baseUrl (e.g. started via Vite). If
 * `?synthetic=shape-witness-<fixtureId>` is not yet handled by the renderer,
 * the capture will still succeed (the page loads) but `metadata.rendererStubWarning`
 * will be true. The renderer-path-integration lane wires the real fixture loading.
 *
 * This function exercises the REAL renderer path: it launches a real Chromium browser
 * with --enable-unsafe-webgpu, navigates to the renderer URL, waits for the canvas,
 * and captures a screenshot. It does NOT use a CPU-only fake renderer.
 *
 * @param {string} fixtureId - One of SHAPE_WITNESS_FIXTURE_IDS
 * @param {object} [options]
 * @param {string} [options.baseUrl] - Base URL of the running renderer (required)
 * @param {string} [options.browserChannel] - Playwright browser channel
 * @param {string} [options.browserExecutable] - Path to browser executable (overrides channel)
 * @param {boolean} [options.headless=true] - Run browser headlessly
 * @param {number} [options.timeoutMs=20000] - Max wait time for renderer ready
 * @param {number} [options.settleMs=2000] - Settle time after canvas ready
 * @param {string} [options.outputPath] - If set, write PNG to this path
 * @returns {Promise<{ png: Buffer, metadata: object }>}
 */
export async function captureShapeWitness(fixtureId, options = {}) {
  if (!SHAPE_WITNESS_FIXTURE_IDS.includes(fixtureId)) {
    throw new Error(
      `Unrecognized fixture ID: "${fixtureId}". Valid IDs: ${SHAPE_WITNESS_FIXTURE_IDS.join(", ")}`
    );
  }

  const {
    baseUrl,
    browserChannel = DEFAULT_BROWSER_CHANNEL,
    browserExecutable,
    headless = true,
    timeoutMs = DEFAULT_TIMEOUT_MS,
    settleMs = DEFAULT_SETTLE_MS,
    outputPath,
  } = options;

  if (!baseUrl) {
    throw new Error("captureShapeWitness: options.baseUrl is required (e.g. 'http://localhost:5173')");
  }

  const url = buildShapeWitnessUrl(baseUrl, fixtureId);

  const { chromium } = await loadPlaywright();
  const browser = await chromium.launch({
    channel: browserExecutable ? undefined : browserChannel,
    executablePath: browserExecutable,
    headless,
    args: ["--enable-unsafe-webgpu"],
  });

  let png;
  let metadata;

  try {
    const page = await browser.newPage({
      viewport: SHAPE_WITNESS_CAPTURE_VIEWPORT,
      deviceScaleFactor: 1,
    });

    const consoleMessages = [];
    const pageErrors = [];
    page.on("console", (msg) => consoleMessages.push({ type: msg.type(), text: msg.text() }));
    page.on("pageerror", (err) => pageErrors.push(err.stack || err.message));

    await page.goto(url, { waitUntil: "domcontentloaded", timeout: timeoutMs });

    const canvas = page.locator("canvas").first();
    await canvas.waitFor({ state: "attached", timeout: timeoutMs });

    // Wait for renderer readiness. The renderer-path-integration lane will expose
    // window.__MESH_SPLAT_SMOKE__.ready = true when the fixture is loaded.
    // If that signal doesn't appear within timeout, we capture anyway and record
    // rendererStubWarning in metadata.
    let rendererReady = false;
    let rendererLabel = null;
    const startedAt = Date.now();

    while (Date.now() - startedAt < timeoutMs) {
      const evidence = await page.evaluate(() => {
        const smoke = globalThis.__MESH_SPLAT_SMOKE__;
        if (!smoke || typeof smoke !== "object") return null;
        return { ready: smoke.ready, rendererLabel: smoke.rendererLabel };
      });
      if (evidence && evidence.ready) {
        rendererReady = true;
        rendererLabel = evidence.rendererLabel ?? null;
        break;
      }
      await page.waitForTimeout(100);
    }

    await page.waitForTimeout(settleMs);

    // Hide overlays before capturing, same pattern as the existing smoke harness.
    await page.addStyleTag({
      content: "#stats,[data-visual-smoke-ignore]{visibility:hidden!important}",
    });

    const box = await canvas.boundingBox();
    if (!box) {
      throw new Error("shape-witness canvas is not visible — cannot capture screenshot");
    }
    const clip = {
      x: Math.max(0, Math.floor(box.x)),
      y: Math.max(0, Math.floor(box.y)),
      width: Math.max(1, Math.ceil(box.width)),
      height: Math.max(1, Math.ceil(box.height)),
    };

    const screenshotOptions = { clip };
    if (outputPath) {
      screenshotOptions.path = outputPath;
    }
    png = await page.screenshot(screenshotOptions);

    metadata = {
      fixtureId,
      url,
      captureViewport: SHAPE_WITNESS_CAPTURE_VIEWPORT,
      rendererReady,
      rendererLabel,
      // If renderer didn't signal readiness, the synthetic fixture URL may not be
      // wired yet. The renderer-path-integration lane must connect the real fixture loading.
      rendererStubWarning: !rendererReady,
      consoleMessages,
      pageErrors,
      capturedAt: new Date().toISOString(),
    };

    await page.close();
  } finally {
    await browser.close();
  }

  return { png, metadata };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

async function loadPlaywright() {
  try {
    return await import("playwright-core");
  } catch (error) {
    throw new Error(
      "playwright-core is required for shape-witness capture. Run `npm install` before capturing.",
      { cause: error }
    );
  }
}
