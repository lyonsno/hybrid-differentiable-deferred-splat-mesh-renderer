import { decodePng } from "./png-analysis.mjs";

const DEFAULT_COMPARISON_CLASS = "same-branch rerun";
const CHANNEL_MATCH_TOLERANCE = 2;

export function buildTraceCanvasParitySummary({
  screenshotBuffer,
  pageEvidence = {},
  gitIdentity = {},
  url = "",
  comparisonClass = DEFAULT_COMPARISON_CLASS,
  expectedObservationIdentity = null,
} = {}) {
  const observationIdentity = deriveObservationIdentity({ pageEvidence, gitIdentity, url });
  const comparisonIdentity = normalizeObservationIdentity(expectedObservationIdentity);
  const traceRecords = extractSampleableTraceRecords(pageEvidence);
  const identityDiffs = comparisonIdentity ? compareObservationIdentities(observationIdentity, comparisonIdentity) : [];
  const blockers = [];

  for (const [field, value] of Object.entries(observationIdentity)) {
    if (value === "" || value === null || value === undefined) {
      blockers.push(`missing observation identity field: ${field}`);
    }
  }

  if (!comparisonIdentity) {
    blockers.push("missing expected observation identity");
  } else if (identityDiffs.length > 0) {
    blockers.push(...identityDiffs.map((diff) => `observation mismatch: ${diff}`));
  }

  if (traceRecords.length === 0) {
    blockers.push("no sampleable final-accumulation trace records were exposed");
  }

  if (!screenshotBuffer) {
    blockers.push("canvas screenshot buffer is unavailable");
  }

  if (blockers.length > 0) {
    const status = blockers.some((blocker) => blocker.startsWith("missing observation identity field"))
      ? "observation-mismatch"
      : blockers.some((blocker) => blocker.startsWith("observation mismatch"))
        ? "observation-mismatch"
        : "visual-not-run";

    return {
      status,
      comparisonClass,
      observationIdentity,
      comparisonIdentity,
      identityDiffs,
      anchors: [],
      blockers,
      traceAnchorCount: traceRecords.length,
      sampleScale: null,
    };
  }

  const image = decodePng(screenshotBuffer);
  const canvas = pageEvidence.canvas ?? {};
  const sampleScale = deriveSampleScale(image, canvas);
  const identityMatches = identityDiffs.length === 0;
  const anchors = traceRecords.map((record) => sampleTraceAnchor(record, image, sampleScale, identityMatches));
  const anchorBlockers = anchors.flatMap((anchor) => anchor.blockers);
  const mismatches = anchors.filter((anchor) => anchor.status !== "match");

  return {
    status: !comparisonIdentity
      ? "visual-not-run"
      : anchorBlockers.some((blocker) => blocker.startsWith("observation mismatch"))
      ? "observation-mismatch"
      : identityMatches && mismatches.length > 0
        ? "trace-canvas-mismatch"
        : identityMatches
          ? "trace-canvas-match"
          : "observation-mismatch",
    comparisonClass,
    observationIdentity,
    comparisonIdentity,
    identityDiffs,
    anchors,
    blockers: anchorBlockers,
    traceAnchorCount: traceRecords.length,
    sampleScale,
  };
}

export function renderTraceCanvasParitySection(summary) {
  if (!summary) {
    return `## Trace / Canvas Parity

- Status: visual-not-run
- Comparison class: ${DEFAULT_COMPARISON_CLASS}
- Reason: no parity summary was produced.
`;
  }

  const identity = summary.observationIdentity ?? {};
  const expectedIdentity = summary.comparisonIdentity ?? null;
  const blockers = summary.blockers ?? [];
  const anchors = summary.anchors ?? [];
  const rows = anchors.length
    ? anchors
        .map(
          (anchor) => `| ${anchor.anchorId} | ${formatRgba8(anchor.predictedRgba8)} | ${formatRgba8(anchor.sampledRgba)} | ${anchor.maxChannelDelta} | ${anchor.status} |`,
        )
        .join("\n")
    : "| none | n/a | n/a | n/a | n/a |";

  return `## Trace / Canvas Parity

- Comparison class: ${summary.comparisonClass ?? DEFAULT_COMPARISON_CLASS}
- Status: ${summary.status}
- Actual observation identity:
  - Branch: ${identity.branch}
  - Commit: ${identity.commit}
  - URL: ${identity.url}
  - Viewport: ${formatViewport(identity.viewport)}
  - Renderer: ${identity.renderer}
  - Arena backend: ${identity.arenaBackend}
  - Tile size px: ${identity.tileSizePx}
  - Cap: ${identity.cap}
  - Witness view: ${identity.witnessView}
- Expected observation identity:
  - Branch: ${expectedIdentity ? expectedIdentity.branch : "not provided"}
  - Commit: ${expectedIdentity ? expectedIdentity.commit : "not provided"}
  - URL: ${expectedIdentity ? expectedIdentity.url : "not provided"}
  - Viewport: ${expectedIdentity ? formatViewport(expectedIdentity.viewport) : "not provided"}
  - Renderer: ${expectedIdentity ? expectedIdentity.renderer : "not provided"}
  - Arena backend: ${expectedIdentity ? expectedIdentity.arenaBackend : "not provided"}
  - Tile size px: ${expectedIdentity ? expectedIdentity.tileSizePx : "not provided"}
  - Cap: ${expectedIdentity ? expectedIdentity.cap : "not provided"}
  - Witness view: ${expectedIdentity ? expectedIdentity.witnessView : "not provided"}
- Identity diffs: ${summary.identityDiffs?.length ? summary.identityDiffs.join("; ") : "none"}
- Sample scale: ${summary.sampleScale ? `${summary.sampleScale.x.toFixed(3)}x/${summary.sampleScale.y.toFixed(3)}x` : "n/a"}
- Sampled anchors: ${summary.traceAnchorCount ?? anchors.length}
- Blockers: ${blockers.length === 0 ? "none" : blockers.join("; ")}

| Anchor | Predicted RGBA8 | Sampled RGBA8 | Max delta | Status |
| --- | --- | --- | ---: | --- |
${rows}
`;
}

function deriveObservationIdentity({ pageEvidence, gitIdentity, url }) {
  const canvas = pageEvidence.canvas ?? {};
  const tileLocal = pageEvidence.tileLocal ?? {};
  const traceRecord = firstPresentTraceRecord(tileLocal.perPixelFinalColorAccumulation);
  const rendererMetadata = traceRecord?.rendererMetadata ?? {};
  const traceAnchor = traceRecord?.anchorPixel ?? {};
  const witnessView = extractWitnessView(url);
  const tileAddress = traceRecord?.tileAddress ?? {};
  const tileSizePx =
    finiteNumber(tileAddress.tileSizePx) ??
    finiteNumber(rendererMetadata.tileSizePx) ??
    finiteNumber(tileLocal.budget?.tileSizePx) ??
    finiteNumber(canvas.width) ??
    null;

  return {
    branch: stringValue(gitIdentity.branch),
    commit: stringValue(gitIdentity.commit),
    url: stringValue(url),
    viewport: {
      width: finiteNumber(canvas.width) ?? finiteNumber(canvas.clientWidth) ?? null,
      height: finiteNumber(canvas.height) ?? finiteNumber(canvas.clientHeight) ?? null,
    },
    renderer: stringValue(pageEvidence.rendererLabel ?? rendererMetadata.effectiveRenderer),
    arenaBackend: stringValue(pageEvidence.arenaRuntime?.effectiveArenaBackend ?? rendererMetadata.effectiveArenaBackend),
    tileSizePx,
    cap: finiteNumber(tileLocal.visibleCompositedRefLimit ?? tileLocal.budget?.maxRefsPerTile) ?? null,
    witnessView,
    traceAnchor: traceAnchor.id ? stringValue(traceAnchor.id) : "",
  };
}

function extractSampleableTraceRecords(pageEvidence) {
  const traces = pageEvidence?.tileLocal?.perPixelFinalColorAccumulation;
  if (!Array.isArray(traces)) {
    return [];
  }

  return traces.filter((trace) => {
    if (!trace || typeof trace !== "object") return false;
    if (trace.status && trace.status !== "present") return false;
    const outputColor = trace.finalColorAccumulation?.outputColor;
    return Array.isArray(outputColor) && outputColor.length === 4;
  });
}

function sampleTraceAnchor(record, image, sampleScale) {
  const anchor = record.anchorPixel ?? {};
  const anchorX = finiteNumber(anchor.x) ?? 0;
  const anchorY = finiteNumber(anchor.y) ?? 0;
  const x = Math.max(0, Math.min(image.width - 1, Math.round(anchorX * sampleScale.x)));
  const y = Math.max(0, Math.min(image.height - 1, Math.round(anchorY * sampleScale.y)));
  const sampledRgba = readRgbaPixel(image, x, y);
  const predictedRgba8 = rgbaFloatTo8(record.finalColorAccumulation.outputColor);
  const channelDeltas = sampledRgba.map((value, index) => Math.abs(value - predictedRgba8[index]));
  const maxChannelDelta = Math.max(...channelDeltas);
  const totalChannelDelta = channelDeltas.reduce((sum, value) => sum + value, 0);
  const observationMismatch = Boolean(record.rendererMetadata && !rendererMetadataMatches(record));

  return {
    anchorId: stringValue(anchor.id || `anchor-${x}-${y}`),
    anchorPixel: {
      id: stringValue(anchor.id),
      x: finiteNumber(anchor.x) ?? x,
      y: finiteNumber(anchor.y) ?? y,
    },
    predictedRgba: record.finalColorAccumulation.outputColor.map((channel) => Number(channel)),
    predictedRgba8,
    sampledRgba,
    channelDeltas,
    maxChannelDelta,
    totalChannelDelta,
    status: observationMismatch
      ? "observation-mismatch"
      : maxChannelDelta <= CHANNEL_MATCH_TOLERANCE
        ? "match"
        : "mismatch",
    blockers: observationMismatch ? [`observation mismatch for ${stringValue(anchor.id) || "anchor"}`] : [],
  };
}

function rendererMetadataMatches(record) {
  const metadata = record.rendererMetadata ?? {};
  const tileAddress = record.tileAddress ?? {};
  const cap = record.dispatchCache?.maxRefsPerTile ?? record.rendererMetadata?.maxRefsPerTile;
  return (
    stringValue(metadata.requestedRenderer) === "tile-local-visible" &&
    stringValue(metadata.effectiveRenderer) !== "" &&
    stringValue(metadata.requestedArenaBackend) !== "" &&
    stringValue(metadata.effectiveArenaBackend) !== "" &&
    finiteNumber(metadata.tileSizePx) === finiteNumber(tileAddress.tileSizePx) &&
    (cap === undefined || cap === null || Number.isFinite(cap))
  );
}

function deriveSampleScale(image, canvas = {}) {
  const canvasWidth = finiteNumber(canvas.width) ?? finiteNumber(canvas.clientWidth) ?? image.width;
  const canvasHeight = finiteNumber(canvas.height) ?? finiteNumber(canvas.clientHeight) ?? image.height;
  return {
    x: canvasWidth > 0 ? image.width / canvasWidth : 1,
    y: canvasHeight > 0 ? image.height / canvasHeight : 1,
  };
}

function readRgbaPixel(image, x, y) {
  const clampedX = Math.max(0, Math.min(image.width - 1, Math.trunc(x)));
  const clampedY = Math.max(0, Math.min(image.height - 1, Math.trunc(y)));
  const offset = (clampedY * image.width + clampedX) * 4;
  return [
    image.rgba[offset],
    image.rgba[offset + 1],
    image.rgba[offset + 2],
    image.rgba[offset + 3],
  ];
}

function rgbaFloatTo8(rgba) {
  return rgba.map((channel) => clampByte(Math.round((Number(channel) || 0) * 255)));
}

function formatRgba8(rgba) {
  return `[${rgba.map((value) => Number.isFinite(value) ? value : 0).join(", ")}]`;
}

function clampByte(value) {
  return Math.max(0, Math.min(255, value));
}

function firstPresentTraceRecord(traces) {
  if (!Array.isArray(traces)) return null;
  return traces.find((trace) => trace && typeof trace === "object" && (trace.status === "present" || !("status" in trace)));
}

function extractWitnessView(url) {
  if (typeof url !== "string" || url.length === 0) return "";
  try {
    const parsed = new URL(url);
    return parsed.searchParams.get("witnessView") ?? parsed.searchParams.get("view") ?? "";
  } catch {
    return "";
  }
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function normalizeObservationIdentity(identity) {
  if (!identity || typeof identity !== "object") {
    return null;
  }

  const normalized = {
    branch: stringValue(identity.branch),
    commit: stringValue(identity.commit),
    url: stringValue(identity.url),
    viewport: normalizeViewport(identity.viewport),
    renderer: stringValue(identity.renderer),
    arenaBackend: stringValue(identity.arenaBackend),
    tileSizePx: finiteNumber(identity.tileSizePx),
    cap: finiteNumber(identity.cap),
    witnessView: stringValue(identity.witnessView),
  };

  if (Object.values(normalized).every((value) => value === "" || value === null || value === undefined)) {
    return null;
  }

  return normalized;
}

function normalizeViewport(value) {
  if (!value || typeof value !== "object") {
    return { width: null, height: null };
  }

  return {
    width: finiteNumber(value.width),
    height: finiteNumber(value.height),
  };
}

function compareObservationIdentities(actual, expected) {
  if (!expected) {
    return [];
  }

  const diffs = [];
  if (actual.branch !== expected.branch) diffs.push(`branch ${actual.branch || "n/a"} != ${expected.branch || "n/a"}`);
  if (actual.commit !== expected.commit) diffs.push(`commit ${actual.commit || "n/a"} != ${expected.commit || "n/a"}`);
  if (actual.url !== expected.url) diffs.push(`url ${actual.url || "n/a"} != ${expected.url || "n/a"}`);
  if ((actual.viewport?.width ?? null) !== (expected.viewport?.width ?? null) || (actual.viewport?.height ?? null) !== (expected.viewport?.height ?? null)) {
    diffs.push(
      `viewport ${formatViewport(actual.viewport)} != ${formatViewport(expected.viewport)}`,
    );
  }
  if (actual.renderer !== expected.renderer) diffs.push(`renderer ${actual.renderer || "n/a"} != ${expected.renderer || "n/a"}`);
  if (actual.arenaBackend !== expected.arenaBackend) diffs.push(`arenaBackend ${actual.arenaBackend || "n/a"} != ${expected.arenaBackend || "n/a"}`);
  if (actual.tileSizePx !== expected.tileSizePx) diffs.push(`tileSizePx ${actual.tileSizePx ?? "n/a"} != ${expected.tileSizePx ?? "n/a"}`);
  if (actual.cap !== expected.cap) diffs.push(`cap ${actual.cap ?? "n/a"} != ${expected.cap ?? "n/a"}`);
  if (actual.witnessView !== expected.witnessView) diffs.push(`witnessView ${actual.witnessView || "n/a"} != ${expected.witnessView || "n/a"}`);
  return diffs;
}

function formatViewport(viewport) {
  if (!viewport) return "n/a";
  const width = viewport.width ?? "n/a";
  const height = viewport.height ?? "n/a";
  return `${width}x${height}`;
}
