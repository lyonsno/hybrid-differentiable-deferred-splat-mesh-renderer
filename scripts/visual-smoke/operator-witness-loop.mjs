import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import { decodePng } from "./png-analysis.mjs";
import { encodePng } from "./trace-anchor-visual-inertness.mjs";

export const OPERATOR_WITNESS_CAPTURE_IDS = Object.freeze({
  wholeRender: "whole-render-final-color",
  dessertClose: "dessert-close-final-color",
  porousClose: "porous-close-final-color",
  porousOrbitLeft: "porous-close-orbit-left",
  porousOrbitRight: "porous-close-orbit-right",
});

const REQUIRED_CAPTURE_IDS = Object.freeze(Object.values(OPERATOR_WITNESS_CAPTURE_IDS));
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
const DEFAULT_OPERATOR_VISUAL_ROUTE = Object.freeze({
  asset: "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
  arenaBackend: "gpu",
  tileSizePx: "16",
  maxRefsPerTile: "256",
});
const OPERATOR_CAPTURE_TIMEOUT_MS = 15000;
const OPERATOR_TIMEOUT_CANVAS_CLIP_MS = 1500;
const OPERATOR_TIMEOUT_SCREENSHOT_MS = 2500;

export function buildOperatorWitnessLoopPlan(baseUrl, { timeoutMs = OPERATOR_CAPTURE_TIMEOUT_MS } = {}) {
  return [
    visualCapture(baseUrl, {
      id: OPERATOR_WITNESS_CAPTURE_IDS.wholeRender,
      title: "Whole render final color",
      evidenceRole: "operator-visual",
      witnessView: null,
      timeoutMs,
    }),
    visualCapture(baseUrl, {
      id: OPERATOR_WITNESS_CAPTURE_IDS.dessertClose,
      title: "Dessert close final color",
      evidenceRole: "operator-visual",
      witnessView: "dessert-close",
      timeoutMs,
    }),
    visualCapture(baseUrl, {
      id: OPERATOR_WITNESS_CAPTURE_IDS.porousClose,
      title: "Porous close final color",
      evidenceRole: "operator-visual",
      witnessView: "dessert-porous-close",
      timeoutMs,
    }),
    visualCapture(baseUrl, {
      id: OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitLeft,
      title: "Porous close orbit frame left",
      evidenceRole: "operator-filmstrip",
      witnessView: "dessert-porous-close",
      interactions: [{ type: "drag", button: "left", dx: -120, dy: 0 }],
      timeoutMs,
    }),
    visualCapture(baseUrl, {
      id: OPERATOR_WITNESS_CAPTURE_IDS.porousOrbitRight,
      title: "Porous close orbit frame right",
      evidenceRole: "operator-filmstrip",
      witnessView: "dessert-porous-close",
      interactions: [{ type: "drag", button: "left", dx: 120, dy: 0 }],
      timeoutMs,
    }),
  ];
}

export function classifyOperatorWitnessLoop({ captures = [], contactSheetPath } = {}) {
  const byId = new Map(captures.map((capture) => [capture.id, capture]));
  const findings = [];

  for (const id of REQUIRED_CAPTURE_IDS) {
    const capture = byId.get(id);
    if (!capture) {
      findings.push(finding("missing-capture", `Missing ${id} operator witness capture.`));
      continue;
    }
    if (!capture.classification?.harnessPassed) {
      findings.push(finding("capture-smoke-failed", `${id} did not pass visual smoke classification.`));
    }
    if (!captureReportsRealSplatEvidence(capture)) {
      findings.push(finding("missing-real-splat-evidence", `${id} did not report real Scaniverse splat evidence.`));
    }
    if (!capture.imageAnalysis?.nonblank) {
      findings.push(finding("blank-capture", `${id} did not produce a nonblank image.`));
    }
    if (hasTracePresentationCoupling(capture)) {
      findings.push(finding("trace-coupled-visual-route", `${id} visual route still carries trace or presentation anchors.`));
    }
    const routeFindings = classifyOperatorRoute(capture);
    for (const routeFinding of routeFindings) {
      findings.push(routeFinding);
    }
  }

  if (!contactSheetPath) {
    findings.push(finding("missing-contact-sheet", "Operator witness loop did not produce a contact sheet."));
  }

  const closeable = findings.length === 0;
  return {
    closeable,
    summary: {
      status: closeable ? "PASS" : "FAIL",
      text: closeable
        ? "PASS: operator witness loop captured whole render, close crops, and interaction filmstrip as real Scaniverse visual evidence."
        : `FAIL: ${findings[0]?.summary ?? "operator witness loop criteria were not satisfied"}`,
    },
    metrics: {
      captureCount: captures.length,
      operatorVisualCaptures: captures.filter((capture) => capture.evidenceRole === "operator-visual").length,
      filmstripCaptures: captures.filter((capture) => capture.evidenceRole === "operator-filmstrip").length,
      witnessViews: unique(captures.map((capture) => routeWitnessView(capture))),
      renderers: unique(captures.map((capture) => routeField(capture, "renderer")).filter(Boolean)),
      arenaBackends: unique(captures.map((capture) => routeField(capture, "arenaBackend")).filter(Boolean)),
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
    },
    findings,
  };
}

export async function writeOperatorWitnessContactSheet({ captures = [], appRoot = process.cwd(), reportDir }) {
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
  const outputPath = path.join(reportDir, "operator-witness-contact-sheet.png");
  await writeFile(outputPath, encodePng(sheet));
  return path.relative(appRoot, outputPath);
}

function visualCapture(baseUrl, { id, title, evidenceRole, witnessView, timeoutMs, interactions = [] }) {
  const url = new URL(baseUrl);
  scrubVisualRoute(url);
  applyCanonicalOperatorVisualRoute(url);
  url.searchParams.set("renderer", "tile-local-visible");
  url.searchParams.delete("witnessView");
  url.searchParams.delete("view");
  return {
    id,
    title,
    evidenceRole,
    witnessView: witnessView ?? "default",
    expectedRendererLabel: "tile-local-visible",
    timeoutMs,
    timeoutCanvasClipMs: OPERATOR_TIMEOUT_CANVAS_CLIP_MS,
    timeoutScreenshotMs: OPERATOR_TIMEOUT_SCREENSHOT_MS,
    url: url.toString().replaceAll("%2F", "/"),
    interactions,
  };
}

function scrubVisualRoute(url) {
  for (const param of TRACE_PRESENTATION_PARAMS) {
    url.searchParams.delete(param);
  }
  for (const param of DEBUG_PARAMS) {
    url.searchParams.delete(param);
  }
}

function applyCanonicalOperatorVisualRoute(url) {
  for (const [key, value] of Object.entries(DEFAULT_OPERATOR_VISUAL_ROUTE)) {
    url.searchParams.set(key, value);
  }
}

function hasTracePresentationCoupling(capture = {}) {
  const identity = capture.routeIdentity ?? {};
  return Boolean(
    identity.traceAnchors ||
      identity.traceAnchor ||
      identity.presentationAnchors ||
      identity.presentationAnchor ||
      identity.presentationScope === "anchor-neighborhood"
  );
}

function captureReportsRealSplatEvidence(capture = {}) {
  if (capture.classification?.realSplatEvidence) {
    return true;
  }
  const sourceKind = String(capture.pageEvidence?.sourceKind ?? capture.classification?.sourceKind ?? "").toLowerCase();
  const splatCount = Number(capture.pageEvidence?.splatCount ?? capture.classification?.splatCount ?? 0);
  const assetPath = String(capture.pageEvidence?.assetPath ?? capture.classification?.assetPath ?? "");
  return sourceKind.includes("scaniverse") && splatCount > 0 && assetPath.length > 0;
}

function classifyOperatorRoute(capture = {}) {
  const findings = [];
  const expected = {
    assetPath: DEFAULT_OPERATOR_VISUAL_ROUTE.asset,
    renderer: "tile-local-visible",
    arenaBackend: DEFAULT_OPERATOR_VISUAL_ROUTE.arenaBackend,
    tileSizePx: DEFAULT_OPERATOR_VISUAL_ROUTE.tileSizePx,
    maxRefsPerTile: DEFAULT_OPERATOR_VISUAL_ROUTE.maxRefsPerTile,
  };
  for (const [key, value] of Object.entries(expected)) {
    const actual = routeField(capture, key);
    if (actual !== value) {
      findings.push(
        finding(
          "operator-route-fallback",
          `${capture.id ?? "operator capture"} used ${key}=${actual || "missing"} instead of ${value}.`
        )
      );
    }
  }
  const effectiveArenaBackend = routeField(capture, "effectiveArenaBackend");
  if (effectiveArenaBackend && effectiveArenaBackend !== DEFAULT_OPERATOR_VISUAL_ROUTE.arenaBackend) {
    findings.push(
      finding(
        "operator-route-fallback",
        `${capture.id ?? "operator capture"} effective arena backend was ${effectiveArenaBackend} instead of gpu.`
      )
    );
  }
  return findings;
}

function routeWitnessView(capture = {}) {
  return routeField(capture, "witnessView") || "default";
}

function routeField(capture = {}, key) {
  const identity = capture.routeIdentity && typeof capture.routeIdentity === "object" ? capture.routeIdentity : {};
  if (identity[key] !== undefined && identity[key] !== null && identity[key] !== "") {
    return String(identity[key]);
  }
  try {
    const url = new URL(capture.url);
    if (key === "witnessView") return url.searchParams.get("witnessView") || url.searchParams.get("view") || "";
    if (key === "assetPath") return url.searchParams.get("asset") || "";
    return url.searchParams.get(key) || "";
  } catch {
    return "";
  }
}

function buildContactSheet(panels) {
  const normalizedPanels = panels.map(({ image }) => normalizeImage(image));
  const targetWidth = Math.min(640, Math.max(...normalizedPanels.map((image) => image.width)));
  const scaledPanels = normalizedPanels.map((image) => scaleToWidth(image, targetWidth));
  const gap = 8;
  const width = scaledPanels.reduce((sum, image) => sum + image.width, 0) + gap * Math.max(0, scaledPanels.length - 1);
  const height = Math.max(...scaledPanels.map((image) => image.height));
  const rgba = Buffer.alloc(width * height * 4);
  fill(rgba, [5, 5, 10, 255]);
  let x = 0;
  for (const image of scaledPanels) {
    blit(rgba, width, height, image, x, 0);
    x += image.width + gap;
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
