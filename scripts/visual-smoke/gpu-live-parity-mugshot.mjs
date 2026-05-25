import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { decodePng } from "./png-analysis.mjs";
import { encodePng } from "./trace-anchor-visual-inertness.mjs";

export const GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS = Object.freeze({
  wholeCpu: "whole-render-cpu-reference",
  wholeGpu: "whole-render-direct-gpu",
  dessertCloseCpu: "dessert-close-cpu-reference",
  dessertCloseGpu: "dessert-close-direct-gpu",
  porousCloseCpu: "porous-close-cpu-reference",
  porousCloseGpu: "porous-close-direct-gpu",
});

export const GPU_LIVE_PARITY_MUGSHOT_PAIRS = Object.freeze([
  {
    id: "whole-render",
    title: "Whole render",
    witnessView: "default",
    cpuCaptureId: GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeCpu,
    gpuCaptureId: GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.wholeGpu,
  },
  {
    id: "dessert-close",
    title: "Dessert close",
    witnessView: "dessert-close",
    cpuCaptureId: GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseCpu,
    gpuCaptureId: GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.dessertCloseGpu,
  },
  {
    id: "porous-close",
    title: "Porous close",
    witnessView: "dessert-porous-close",
    cpuCaptureId: GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseCpu,
    gpuCaptureId: GPU_LIVE_PARITY_MUGSHOT_CAPTURE_IDS.porousCloseGpu,
  },
]);

const DEFAULT_ROUTE = Object.freeze({
  asset: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
  renderer: "tile-local-visible",
  tileSizePx: "16",
  maxRefsPerTile: "256",
});
const TRACE_PRESENTATION_PARAMS = Object.freeze([
  "traceAnchors",
  "traceAnchor",
  "presentationAnchors",
  "presentationAnchor",
  "tileLocalPresentationAnchors",
  "tileLocalPresentationAnchor",
  "presentationScope",
  "presentationMode",
  "tileLocalPresentationScope",
  "tileLocalPresentationMode",
]);
const DEBUG_PARAMS = Object.freeze(["tileDebug", "debug"]);
const DEFAULT_TIMEOUT_MS = 60000;
const DIFFERENT_PIXEL_THRESHOLD = 8;
const VISUAL_DIVERGENCE_THRESHOLD = 0.005;
const REF_DIVERGENCE_RATIO = 2;

export function buildGpuLiveParityMugshotPlan(baseUrl, { timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const captures = [];
  for (const pair of GPU_LIVE_PARITY_MUGSHOT_PAIRS) {
    captures.push(
      captureForPair(baseUrl, pair, {
        id: pair.cpuCaptureId,
        title: `${pair.title} CPU reference`,
        routeRole: "cpu-reference",
        arenaBackend: "cpu",
        timeoutMs,
      }),
      captureForPair(baseUrl, pair, {
        id: pair.gpuCaptureId,
        title: `${pair.title} direct GPU live`,
        routeRole: "direct-gpu-live",
        arenaBackend: "gpu",
        timeoutMs,
      })
    );
  }
  return captures;
}

export async function buildGpuLiveParityImageComparisons({ captures = [], appRoot = process.cwd() } = {}) {
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const comparisons = [];
  for (const pair of GPU_LIVE_PARITY_MUGSHOT_PAIRS) {
    const cpu = byId.get(pair.cpuCaptureId);
    const gpu = byId.get(pair.gpuCaptureId);
    if (!cpu?.screenshotPath || !gpu?.screenshotPath) continue;
    comparisons.push(await compareCaptureImages({ pairId: pair.id, cpu, gpu, appRoot }));
  }
  return comparisons;
}

export function classifyGpuLiveParityMugshot({ captures = [], comparisons = [], contactSheetPath } = {}) {
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const comparisonsByPair = new Map(comparisons.map((comparison) => [comparison.pairId, comparison]));
  const findings = [];
  const pairs = [];

  for (const pair of GPU_LIVE_PARITY_MUGSHOT_PAIRS) {
    const cpu = byId.get(pair.cpuCaptureId);
    const gpu = byId.get(pair.gpuCaptureId);
    if (!cpu || !gpu) {
      findings.push(finding("missing-pair-capture", `${pair.id} is missing its CPU or GPU capture.`));
      continue;
    }

    for (const capture of [cpu, gpu]) {
      if (!capture.classification?.harnessPassed && !captureHasParityEvidence(capture)) {
        findings.push(finding("capture-smoke-failed", `${capture.id} did not pass visual smoke classification.`));
      }
      if (!captureHasNonBackgroundPixels(capture)) {
        findings.push(finding("blank-capture", `${capture.id} did not produce non-background final-color pixels.`));
      }
      if (!capture.classification?.realSplatEvidence && !captureReportsRealSplatEvidence(capture)) {
        findings.push(finding("missing-real-splat-evidence", `${capture.id} did not report real Scaniverse splat evidence.`));
      }
      if (!hasScreenshotImage(capture)) {
        findings.push(finding("missing-screenshot-image", `${capture.id} did not produce screenshot image data.`));
      }
      if (!rendererLabel(capture).includes("tile-local-visible")) {
        findings.push(
          finding(
            "renderer-label-mismatch",
            `${capture.id} reported renderer label ${rendererLabel(capture) || "missing"} instead of tile-local-visible.`
          )
        );
      }
    }

    const routeFinding = comparePairRoutes(pair, cpu, gpu);
    if (routeFinding) {
      findings.push(routeFinding);
    }

    const comparison = comparisonsByPair.get(pair.id);
    if (!comparison) {
      findings.push(finding("missing-image-comparison", `${pair.id} did not produce a CPU/GPU final-color image comparison.`));
    } else if (comparison.comparable === false) {
      findings.push(
        finding(
          "image-comparison-not-comparable",
          `${pair.id} CPU/GPU final-color images were not comparable: ${comparison.reason || "unknown reason"}.`
        )
      );
    }
    pairs.push(summarizePair(pair, cpu, gpu, comparison));
  }

  if (!contactSheetPath) {
    findings.push(finding("missing-contact-sheet", "GPU live parity mugshot did not produce a contact sheet."));
  }

  const divergence = classifyDivergence(pairs);
  const closeable = findings.length === 0;
  return {
    closeable,
    summary: {
      status: closeable ? "PASS" : "FAIL",
      text: closeable
        ? `PASS: CPU reference and direct GPU live routes were captured under ${pairs.length} same-view final-color pairs; primary divergence is ${divergence.primary}.`
        : `FAIL: ${findings[0]?.summary ?? "GPU live parity mugshot criteria were not satisfied"}`,
    },
    metrics: {
      captureCount: captures.length,
      pairCount: pairs.length,
      witnessViews: unique(pairs.map((pair) => pair.witnessView).filter(Boolean)),
      routeRoles: unique(captures.map((capture) => capture.routeRole).filter(Boolean)),
      arenaBackends: unique(captures.map((capture) => routeField(capture, "arenaBackend")).filter(Boolean)),
      effectiveArenaBackends: unique(captures.map((capture) => routeField(capture, "effectiveArenaBackend")).filter(Boolean)),
      tileBudgets: unique(
        captures
          .map((capture) => {
            const tileSizePx = routeField(capture, "tileSizePx");
            const maxRefsPerTile = routeField(capture, "maxRefsPerTile");
            return tileSizePx && maxRefsPerTile ? `${tileSizePx}px/${maxRefsPerTile} refs` : "";
          })
          .filter(Boolean)
      ),
      contactSheetPath: contactSheetPath ?? "",
      pairs,
    },
    divergence,
    findings,
  };
}

export async function writeGpuLiveParityMugshotContactSheet({ captures = [], appRoot = process.cwd(), reportDir }) {
  const images = [];
  for (const capture of captures) {
    if (!capture.screenshotPath) continue;
    const screenshotPath = path.isAbsolute(capture.screenshotPath)
      ? capture.screenshotPath
      : path.resolve(appRoot, capture.screenshotPath);
    const png = await readFile(screenshotPath);
    images.push({ title: capture.id, image: decodePng(png) });
  }
  if (images.length === 0) {
    return undefined;
  }
  const sheet = buildContactSheet(images);
  const outputPath = path.join(reportDir, "gpu-live-parity-mugshot-contact-sheet.png");
  await writeFile(outputPath, encodePng(sheet));
  return path.relative(appRoot, outputPath);
}

function captureForPair(baseUrl, pair, { id, title, routeRole, arenaBackend, timeoutMs }) {
  const url = new URL(baseUrl);
  scrubWitnessRoute(url);
  for (const [key, value] of Object.entries(DEFAULT_ROUTE)) {
    url.searchParams.set(key, value);
  }
  url.searchParams.set("arenaBackend", arenaBackend);
  url.searchParams.delete("witnessView");
  url.searchParams.delete("view");
  if (pair.witnessView !== "default") {
    url.searchParams.set("witnessView", pair.witnessView);
  }
  return {
    id,
    title,
    pairId: pair.id,
    routeRole,
    evidenceRole: "gpu-live-parity-mugshot",
    witnessView: pair.witnessView,
    expectedRendererLabel: "tile-local-visible",
    timeoutMs,
    timeoutScreenshotMs: timeoutMs,
    url: url.toString().replaceAll("%2F", "/"),
  };
}

function scrubWitnessRoute(url) {
  for (const param of TRACE_PRESENTATION_PARAMS) {
    url.searchParams.delete(param);
  }
  for (const param of DEBUG_PARAMS) {
    url.searchParams.delete(param);
  }
}

async function compareCaptureImages({ pairId, cpu, gpu, appRoot }) {
  const cpuPath = path.isAbsolute(cpu.screenshotPath) ? cpu.screenshotPath : path.resolve(appRoot, cpu.screenshotPath);
  const gpuPath = path.isAbsolute(gpu.screenshotPath) ? gpu.screenshotPath : path.resolve(appRoot, gpu.screenshotPath);
  const cpuImage = decodePng(await readFile(cpuPath));
  const gpuImage = decodePng(await readFile(gpuPath));
  if (cpuImage.width !== gpuImage.width || cpuImage.height !== gpuImage.height) {
    return {
      pairId,
      width: Math.max(cpuImage.width, gpuImage.width),
      height: Math.max(cpuImage.height, gpuImage.height),
      comparable: false,
      changedPixels: 0,
      totalPixels: 0,
      changedPixelRatio: 0,
      reason: `dimension mismatch: cpu ${cpuImage.width}x${cpuImage.height}, gpu ${gpuImage.width}x${gpuImage.height}`,
    };
  }
  let changedPixels = 0;
  let deltaSum = 0;
  for (let offset = 0; offset < cpuImage.rgba.length; offset += 4) {
    const delta =
      (Math.abs(cpuImage.rgba[offset] - gpuImage.rgba[offset]) +
        Math.abs(cpuImage.rgba[offset + 1] - gpuImage.rgba[offset + 1]) +
        Math.abs(cpuImage.rgba[offset + 2] - gpuImage.rgba[offset + 2])) /
      3;
    deltaSum += delta;
    if (delta >= DIFFERENT_PIXEL_THRESHOLD) {
      changedPixels += 1;
    }
  }
  const totalPixels = cpuImage.width * cpuImage.height;
  return {
    pairId,
    width: cpuImage.width,
    height: cpuImage.height,
    comparable: true,
    changedPixels,
    totalPixels,
    changedPixelRatio: totalPixels === 0 ? 0 : changedPixels / totalPixels,
    averageDelta: totalPixels === 0 ? 0 : deltaSum / totalPixels,
    pixelDeltaThreshold: DIFFERENT_PIXEL_THRESHOLD,
  };
}

function comparePairRoutes(pair, cpu, gpu) {
  const fields = ["assetPath", "witnessView", "renderer", "tileSizePx", "maxRefsPerTile", "viewport"];
  for (const field of fields) {
    const left = routeComparableValue(cpu, field);
    const right = routeComparableValue(gpu, field);
    if (left !== right) {
      return finding(
        "pair-route-mismatch",
        `${pair.id} CPU/GPU captures differ on ${field}: ${left || "missing"} vs ${right || "missing"}.`
      );
    }
  }
  if (routeField(cpu, "arenaBackend") !== "cpu" || routeField(gpu, "arenaBackend") !== "gpu") {
    return finding(
      "pair-backend-mismatch",
      `${pair.id} expected arenaBackend cpu/gpu but saw ${routeField(cpu, "arenaBackend") || "missing"}/${routeField(gpu, "arenaBackend") || "missing"}.`
    );
  }
  if (routeField(cpu, "effectiveArenaBackend") !== "cpu" || routeField(gpu, "effectiveArenaBackend") !== "gpu") {
    return finding(
      "pair-effective-backend-mismatch",
      `${pair.id} expected effectiveArenaBackend cpu/gpu but saw ${routeField(cpu, "effectiveArenaBackend") || "missing"}/${routeField(gpu, "effectiveArenaBackend") || "missing"}.`
    );
  }
  return null;
}

function summarizePair(pair, cpu, gpu, comparison) {
  const cpuRefs = tileRefs(cpu);
  const gpuRefs = tileRefs(gpu);
  const lowerRefs = Math.max(1, Math.min(cpuRefs || 0, gpuRefs || 0));
  const upperRefs = Math.max(cpuRefs || 0, gpuRefs || 0);
  return {
    pairId: pair.id,
    witnessView: routeField(cpu, "witnessView") || pair.witnessView,
    cpuCaptureId: cpu.id,
    gpuCaptureId: gpu.id,
    cpuRefs,
    gpuRefs,
    refRatio: lowerRefs > 0 ? upperRefs / lowerRefs : 0,
    cpuEffectiveArenaBackend: routeField(cpu, "effectiveArenaBackend"),
    gpuEffectiveArenaBackend: routeField(gpu, "effectiveArenaBackend"),
    changedPixelRatio: finiteNumber(comparison?.changedPixelRatio) ?? 0,
    changedPixels: finiteNumber(comparison?.changedPixels) ?? 0,
    totalPixels: finiteNumber(comparison?.totalPixels) ?? 0,
    imageComparable: comparison?.comparable !== false,
    imageComparisonReason: comparison?.reason ?? "",
  };
}

function classifyDivergence(pairs) {
  const tileRefPairs = pairs.filter((pair) => pair.refRatio >= REF_DIVERGENCE_RATIO);
  const visualPairs = pairs.filter((pair) => pair.changedPixelRatio >= VISUAL_DIVERGENCE_THRESHOLD);
  let primary = "no-observed-divergence";
  if (tileRefPairs.length > 0) {
    primary = "tile-ref-population-divergence";
  } else if (visualPairs.length > 0) {
    primary = "final-color-divergence";
  }
  return {
    primary,
    pairsNeedingInvestigation: unique([...tileRefPairs, ...visualPairs].map((pair) => pair.pairId)).length,
    tileRefDivergencePairs: tileRefPairs.map((pair) => pair.pairId),
    finalColorDivergencePairs: visualPairs.map((pair) => pair.pairId),
    thresholds: {
      refRatio: REF_DIVERGENCE_RATIO,
      changedPixelRatio: VISUAL_DIVERGENCE_THRESHOLD,
    },
  };
}

function rendererLabel(capture = {}) {
  return String(capture.pageEvidence?.rendererLabel ?? capture.classification?.rendererLabel ?? "");
}

function captureReportsRealSplatEvidence(capture = {}) {
  const sourceKind = String(capture.pageEvidence?.sourceKind ?? capture.classification?.sourceKind ?? "").toLowerCase();
  const splatCount = Number(capture.pageEvidence?.splatCount ?? capture.classification?.splatCount ?? 0);
  const assetPath = String(capture.pageEvidence?.assetPath ?? capture.classification?.assetPath ?? "");
  return sourceKind.includes("scaniverse") && splatCount > 0 && assetPath.length > 0;
}

function captureHasParityEvidence(capture = {}) {
  return (
    captureReportsRealSplatEvidence(capture) &&
    hasScreenshotImage(capture) &&
    captureHasNonBackgroundPixels(capture) &&
    rendererLabel(capture).includes("tile-local-visible")
  );
}

function captureHasNonBackgroundPixels(capture = {}) {
  const imageAnalysis = capture.imageAnalysis ?? {};
  return positiveNumber(imageAnalysis.changedPixels) && positiveNumber(imageAnalysis.totalPixels);
}

function hasScreenshotImage(capture = {}) {
  return Boolean(
    capture.screenshotPath &&
      positiveNumber(capture.imageAnalysis?.width) &&
      positiveNumber(capture.imageAnalysis?.height) &&
      positiveNumber(capture.imageAnalysis?.totalPixels)
  );
}

function routeComparableValue(capture, field) {
  const value = routeField(capture, field);
  if (field === "viewport" && value && typeof value === "object") {
    return `${value.width}x${value.height}`;
  }
  return String(value ?? "");
}

function routeField(capture = {}, key) {
  const identity = capture.routeIdentity && typeof capture.routeIdentity === "object" ? capture.routeIdentity : {};
  if (identity[key] !== undefined && identity[key] !== null && identity[key] !== "") {
    return identity[key];
  }
  if (key === "effectiveArenaBackend") {
    return capture.pageEvidence?.arenaRuntime?.effectiveArenaBackend ?? "";
  }
  if (key === "arenaBackend") {
    return capture.pageEvidence?.arenaRuntime?.requestedArenaBackend ?? "";
  }
  if (key === "assetPath") {
    return capture.pageEvidence?.assetPath ?? "";
  }
  if (key === "witnessView") {
    return capture.witnessView ?? "default";
  }
  try {
    const url = new URL(capture.url);
    if (key === "witnessView") return url.searchParams.get("witnessView") || url.searchParams.get("view") || "default";
    if (key === "assetPath") return url.searchParams.get("asset") || "";
    return url.searchParams.get(key) || "";
  } catch {
    return "";
  }
}

function tileRefs(capture = {}) {
  return finiteNumber(capture.pageEvidence?.tileLocal?.refs) ?? finiteNumber(capture.pageEvidence?.tileLocal?.diagnostics?.tileRefs?.total) ?? 0;
}

function buildContactSheet(panels) {
  const normalizedPanels = panels.map(({ image }) => normalizeImage(image));
  const targetWidth = Math.min(520, Math.max(...normalizedPanels.map((image) => image.width)));
  const scaledPanels = normalizedPanels.map((image) => scaleToWidth(image, targetWidth));
  const gap = 8;
  const columns = 2;
  const rows = Math.ceil(scaledPanels.length / columns);
  const cellWidth = Math.max(...scaledPanels.map((image) => image.width));
  const cellHeight = Math.max(...scaledPanels.map((image) => image.height));
  const width = columns * cellWidth + gap * (columns - 1);
  const height = rows * cellHeight + gap * Math.max(0, rows - 1);
  const rgba = Buffer.alloc(width * height * 4);
  fill(rgba, [5, 5, 10, 255]);
  for (let index = 0; index < scaledPanels.length; index += 1) {
    const image = scaledPanels[index];
    const x = (index % columns) * (cellWidth + gap);
    const y = Math.floor(index / columns) * (cellHeight + gap);
    blit(rgba, width, height, image, x, y);
  }
  return { width, height, rgba };
}

function normalizeImage(image) {
  if (!image || !Number.isInteger(image.width) || !Number.isInteger(image.height) || !Buffer.isBuffer(image.rgba)) {
    throw new Error("Contact sheet image must have width, height, and RGBA buffer");
  }
  return image;
}

function scaleToWidth(image, targetWidth) {
  if (image.width <= targetWidth) return image;
  const scale = targetWidth / image.width;
  const width = targetWidth;
  const height = Math.max(1, Math.round(image.height * scale));
  const rgba = Buffer.alloc(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    const sourceY = Math.min(image.height - 1, Math.floor(y / scale));
    for (let x = 0; x < width; x += 1) {
      const sourceX = Math.min(image.width - 1, Math.floor(x / scale));
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const targetOffset = (y * width + x) * 4;
      image.rgba.copy(rgba, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
  return { width, height, rgba };
}

function fill(rgba, color) {
  for (let offset = 0; offset < rgba.length; offset += 4) {
    rgba[offset] = color[0];
    rgba[offset + 1] = color[1];
    rgba[offset + 2] = color[2];
    rgba[offset + 3] = color[3];
  }
}

function blit(targetRgba, targetWidth, targetHeight, source, targetX, targetY) {
  for (let y = 0; y < source.height; y += 1) {
    const outY = targetY + y;
    if (outY < 0 || outY >= targetHeight) continue;
    for (let x = 0; x < source.width; x += 1) {
      const outX = targetX + x;
      if (outX < 0 || outX >= targetWidth) continue;
      const sourceOffset = (y * source.width + x) * 4;
      const targetOffset = (outY * targetWidth + outX) * 4;
      source.rgba.copy(targetRgba, targetOffset, sourceOffset, sourceOffset + 4);
    }
  }
}

function finding(kind, summary) {
  return { kind, summary };
}

function unique(values) {
  return [...new Set(values)];
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function positiveNumber(value) {
  const number = finiteNumber(value);
  return number !== null && number > 0 ? number : null;
}
