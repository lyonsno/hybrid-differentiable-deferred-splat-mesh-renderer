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
export const GPU_LIVE_PARITY_MUGSHOT_TRACE_ANCHORS = Object.freeze([
  "whole-a@528,400:visible-splat",
  "whole-b@752,416:visible-splat",
  "whole-c@784,400:visible-splat",
  "close-a@976,512:visible-splat",
  "close-b@768,496:visible-splat",
  "close-c@496,496:visible-splat",
  "close-d@432,512:visible-splat",
  "porous-a@672,576:visible-splat",
  "porous-b@544,576:visible-splat",
  "porous-c@336,640:visible-splat",
  "porous-d@272,672:visible-splat",
  "porous-e@800,576:visible-splat",
].join(";"));
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
      if (capture.captureFailure) {
        findings.push(
          finding(
            "capture-failed",
            `${capture.id} reported ${capture.captureFailure.kind || "capture failure"} before the pair could close.`
          )
        );
      }
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
    const gpuRefSourceFinding = validateDirectGpuRefSource(pair, gpu);
    if (gpuRefSourceFinding) {
      findings.push(gpuRefSourceFinding);
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
  url.searchParams.set("traceAnchors", GPU_LIVE_PARITY_MUGSHOT_TRACE_ANCHORS);
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
  const fields = [
    "assetPath",
    "witnessView",
    "renderer",
    "tileSizePx",
    "maxRefsPerTile",
    "traceAnchors",
    "presentationAnchors",
    "presentationScope",
    "viewport",
  ];
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
  for (const [role, capture] of [["CPU", cpu], ["GPU", gpu]]) {
    const traceAnchors = routeField(capture, "traceAnchors");
    if (traceAnchors !== GPU_LIVE_PARITY_MUGSHOT_TRACE_ANCHORS) {
      return finding(
        "pair-route-contract-mismatch",
        `${pair.id} ${role} capture carried ${traceAnchors || "missing"} trace anchors instead of the canonical GPU live parity mugshot anchors.`
      );
    }
    const presentationAnchors = routeField(capture, "presentationAnchors");
    if (presentationAnchors) {
      return finding(
        "pair-route-contract-mismatch",
        `${pair.id} ${role} capture carried presentation anchors (${presentationAnchors}) in a full-scene mugshot route.`
      );
    }
    const presentationScope = routeField(capture, "presentationScope");
    if (presentationScope && presentationScope !== "full-scene") {
      return finding(
        "pair-route-contract-mismatch",
        `${pair.id} ${role} capture carried presentation scope ${presentationScope} instead of full-scene.`
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

function validateDirectGpuRefSource(pair, gpu) {
  const refSource = tileRefSource(gpu);
  const refStatus = tileRefStatus(gpu);
  if (refSource !== "gpu-scatter-cursor-readback" || refStatus !== "present") {
    return finding(
      "gpu-live-ref-source-missing",
      `${pair.id} direct GPU live capture reported refs from ${refSource || "missing"} (${refStatus || "missing"}) instead of present gpu-scatter-cursor-readback.`
    );
  }
  return null;
}

function summarizePair(pair, cpu, gpu, comparison) {
  const cpuRefs = tileRefs(cpu);
  const gpuRefs = tileRefs(gpu);
  const cpuRefSource = tileRefSource(cpu);
  const gpuRefSource = tileRefSource(gpu);
  const finalColorLedger = summarizeFinalColorDivergenceLedger({ cpu, gpu });
  const lowerRefs = Math.max(1, Math.min(cpuRefs || 0, gpuRefs || 0));
  const upperRefs = Math.max(cpuRefs || 0, gpuRefs || 0);
  return {
    pairId: pair.id,
    witnessView: routeField(cpu, "witnessView") || pair.witnessView,
    cpuCaptureId: cpu.id,
    gpuCaptureId: gpu.id,
    cpuRefs,
    gpuRefs,
    cpuRefSource,
    gpuRefSource,
    refRatio: lowerRefs > 0 ? upperRefs / lowerRefs : 0,
    cpuEffectiveArenaBackend: routeField(cpu, "effectiveArenaBackend"),
    gpuEffectiveArenaBackend: routeField(gpu, "effectiveArenaBackend"),
    changedPixelRatio: finiteNumber(comparison?.changedPixelRatio) ?? 0,
    changedPixels: finiteNumber(comparison?.changedPixels) ?? 0,
    totalPixels: finiteNumber(comparison?.totalPixels) ?? 0,
    imageComparable: comparison?.comparable !== false,
    imageComparisonReason: comparison?.reason ?? "",
    finalColorLedger,
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

function summarizeFinalColorDivergenceLedger({ cpu, gpu }) {
  const cpuTrace = summarizeFinalColorCapture(cpu);
  const gpuTrace = summarizeFinalColorCapture(gpu);
  const anchorIds = unique([...cpuTrace.anchors.map((anchor) => anchor.id), ...gpuTrace.anchors.map((anchor) => anchor.id)]);
  const anchorDiffs = anchorIds.map((id) => {
    const left = cpuTrace.anchorsById.get(id);
    const right = gpuTrace.anchorsById.get(id);
    return removeUndefinedProperties({
      id,
      status: compareAnchorStatus(left, right),
      cpuStatus: left?.status,
      gpuStatus: right?.status,
      cpuStepCount: left?.stepCount,
      gpuStepCount: right?.stepCount,
      cpuOutputRgba8: left?.outputRgba8,
      gpuOutputRgba8: right?.outputRgba8,
      cpuBlockers: left?.blockers,
      gpuBlockers: right?.blockers,
    });
  });
  const mismatchedAnchors = anchorDiffs.filter((anchor) => anchor.status !== "match");
  return {
    status: classifyFinalColorLedgerStatus({ cpuTrace, gpuTrace, mismatchedAnchors }),
    cpu: omitAnchorMap(cpuTrace),
    gpu: omitAnchorMap(gpuTrace),
    anchorDiffs,
    mismatchedAnchorIds: mismatchedAnchors.map((anchor) => anchor.id),
  };
}

function classifyFinalColorLedgerStatus({ cpuTrace, gpuTrace, mismatchedAnchors }) {
  if (!cpuTrace.hasRows || !gpuTrace.hasRows) {
    return "missing-final-color-rows";
  }
  if (!cpuTrace.hasContributors || !gpuTrace.hasContributors) {
    return "missing-final-color-contributors";
  }
  if (cpuTrace.compositorInputStatus !== "present" || gpuTrace.compositorInputStatus !== "present") {
    return "missing-live-compositor-input-readback";
  }
  return mismatchedAnchors.length > 0 ? "final-color-row-divergence" : "final-color-row-match";
}

function summarizeFinalColorCapture(capture = {}) {
  const tileLocal = capture.pageEvidence?.tileLocal && typeof capture.pageEvidence.tileLocal === "object"
    ? capture.pageEvidence.tileLocal
    : {};
  const rows = Array.isArray(tileLocal.perPixelFinalColorAccumulation)
    ? tileLocal.perPixelFinalColorAccumulation
    : [];
  const anchors = rows.map(summarizeFinalColorAnchor).filter((anchor) => anchor.id);
  const compositorInputReadback = tileLocal.compositorInputReadback && typeof tileLocal.compositorInputReadback === "object"
    ? tileLocal.compositorInputReadback
    : {};
  const outputTextureReadback = tileLocal.outputTextureReadback && typeof tileLocal.outputTextureReadback === "object"
    ? tileLocal.outputTextureReadback
    : {};
  const anchorsWithReadback = mergeLiveCompositorInputAnchors(
    anchors,
    Array.isArray(compositorInputReadback.anchors) ? compositorInputReadback.anchors : []
  );
  const perPixelBlockedAnchorIds = anchors.filter((anchor) => anchor.status === "blocked").map((anchor) => anchor.id);
  return {
    rowCount: rows.length,
    hasRows: rows.length > 0,
    perPixelHasContributors: anchors.some((anchor) => anchor.stepCount > 0),
    perPixelBlockedAnchorIds,
    hasContributors: anchorsWithReadback.some((anchor) => anchor.stepCount > 0),
    blockedAnchorIds: unique([
      ...anchorsWithReadback.filter((anchor) => anchor.status === "blocked").map((anchor) => anchor.id),
      ...perPixelBlockedAnchorIds,
    ]),
    anchors: anchorsWithReadback,
    anchorsById: new Map(anchorsWithReadback.map((anchor) => [anchor.id, anchor])),
    compositorInputStatus: stringValue(compositorInputReadback.status) || "missing",
    compositorInputSource: stringValue(compositorInputReadback.source) || "missing",
    compositorInputAnchorCount: Array.isArray(compositorInputReadback.anchors) ? compositorInputReadback.anchors.length : 0,
    outputTextureStatus: stringValue(outputTextureReadback.status) || "missing",
    outputTextureAnchorCount: Array.isArray(outputTextureReadback.anchors) ? outputTextureReadback.anchors.length : 0,
    traceCanvasParityStatus: stringValue(capture.pageEvidence?.witness?.traceCanvasParity?.status) || "missing",
    traceCanvasParityKind: stringValue(capture.pageEvidence?.witness?.traceCanvasParity?.kind) || "missing",
  };
}

function summarizeFinalColorAnchor(row = {}) {
  const record = row.traceRecord && typeof row.traceRecord === "object" ? row.traceRecord : row;
  const anchorPixel = row.anchorPixel && typeof row.anchorPixel === "object"
    ? row.anchorPixel
    : record.anchorPixel;
  const accumulation = record.finalColorAccumulation && typeof record.finalColorAccumulation === "object"
    ? record.finalColorAccumulation
    : {};
  const steps = Array.isArray(accumulation.steps) ? accumulation.steps : [];
  return {
    id: stringValue(anchorPixel?.id),
    status: stringValue(row.status) || stringValue(record.status) || (steps.length > 0 ? "present" : "missing"),
    stepCount: steps.length,
    outputRgba8: rgbaFloatTo8(accumulation.outputColor),
    blockers: normalizeBlockers(row.blockers ?? record.blockers),
  };
}

function mergeLiveCompositorInputAnchors(rowAnchors, compositorAnchors) {
  const byId = new Map(rowAnchors.map((anchor) => [anchor.id, anchor]));
  for (const compositorAnchor of compositorAnchors) {
    const id = stringValue(compositorAnchor?.id);
    if (!id) continue;
    const existing = byId.get(id);
    if (existing?.stepCount > 0) {
      continue;
    }
    byId.set(id, summarizeLiveCompositorInputAnchor(compositorAnchor, existing));
  }
  return [...byId.values()];
}

function summarizeLiveCompositorInputAnchor(anchor = {}, fallback = {}) {
  const contributors = Array.isArray(anchor.contributors) ? anchor.contributors : [];
  const outputRgba8 = rgba8Value(anchor.liveCompositorRgba8) || rgbaFloatTo8(anchor.liveCompositorRgba);
  return {
    id: stringValue(anchor.id) || stringValue(fallback.id),
    status: contributors.length > 0 ? "present" : stringValue(fallback.status) || "missing",
    stepCount: contributors.length || finiteNumber(fallback.stepCount) || 0,
    outputRgba8: outputRgba8.length > 0 ? outputRgba8 : Array.isArray(fallback.outputRgba8) ? fallback.outputRgba8 : [],
    blockers: Array.isArray(fallback.blockers) ? fallback.blockers : [],
  };
}

function compareAnchorStatus(cpuAnchor, gpuAnchor) {
  if (!cpuAnchor || !gpuAnchor) {
    return "missing-anchor";
  }
  if (cpuAnchor.status !== gpuAnchor.status || cpuAnchor.stepCount !== gpuAnchor.stepCount) {
    return "trace-shape-mismatch";
  }
  if (!arrayShallowEqual(cpuAnchor.outputRgba8, gpuAnchor.outputRgba8)) {
    return "output-color-mismatch";
  }
  return "match";
}

function omitAnchorMap(trace) {
  const { anchorsById, ...rest } = trace;
  return rest;
}

function normalizeBlockers(blockers) {
  if (!Array.isArray(blockers)) {
    return [];
  }
  return blockers.map((blocker) => {
    if (typeof blocker === "string") {
      return blocker;
    }
    if (blocker && typeof blocker === "object") {
      return [blocker.field, blocker.reason].filter(Boolean).join(": ");
    }
    return String(blocker);
  }).filter(Boolean);
}

function rgbaFloatTo8(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return [];
  }
  return value.map((channel) =>
    Math.max(0, Math.min(255, Math.round(Math.max(0, Math.min(1, finiteNumber(channel) ?? 0)) * 255)))
  );
}

function rgba8Value(value) {
  if (!Array.isArray(value) || value.length !== 4) {
    return null;
  }
  return value.map((channel) =>
    Math.max(0, Math.min(255, Math.round(finiteNumber(channel) ?? 0)))
  );
}

function arrayShallowEqual(left, right) {
  if (!Array.isArray(left) || !Array.isArray(right) || left.length !== right.length) {
    return false;
  }
  return left.every((value, index) => value === right[index]);
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function removeUndefinedProperties(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined));
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
  return finiteNumber(capture.pageEvidence?.tileLocal?.refAccounting?.retainedRefs) ??
    finiteNumber(capture.pageEvidence?.tileLocal?.refStatsReadback?.retainedRefs) ??
    finiteNumber(capture.pageEvidence?.tileLocal?.refs) ??
    finiteNumber(capture.pageEvidence?.tileLocal?.diagnostics?.tileRefs?.total) ??
    0;
}

function tileRefSource(capture = {}) {
  return String(
    capture.pageEvidence?.tileLocal?.refAccounting?.source ??
      capture.pageEvidence?.tileLocal?.refStatsReadback?.source ??
      (capture.pageEvidence?.tileLocal?.refs !== undefined ? "legacy-tile-local-refs" : "")
  );
}

function tileRefStatus(capture = {}) {
  return String(
    capture.pageEvidence?.tileLocal?.refAccounting?.status ??
      capture.pageEvidence?.tileLocal?.refStatsReadback?.status ??
      ""
  );
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
