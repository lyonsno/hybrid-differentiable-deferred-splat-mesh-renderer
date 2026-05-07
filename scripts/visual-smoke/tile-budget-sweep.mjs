export const TILE_BUDGET_SWEEP_PAIRS = Object.freeze([
  { tileSizePx: 6, maxRefsPerTile: 32 },
  { tileSizePx: 12, maxRefsPerTile: 64 },
  { tileSizePx: 16, maxRefsPerTile: 128 },
  { tileSizePx: 16, maxRefsPerTile: 256 },
  { tileSizePx: 24, maxRefsPerTile: 256 },
  { tileSizePx: 32, maxRefsPerTile: 512 },
]);

export function buildTileBudgetSweepPlan(baseUrl, pairs = TILE_BUDGET_SWEEP_PAIRS) {
  return pairs.map((pair) => {
    const url = new URL(baseUrl);
    url.searchParams.set("renderer", "tile-local-visible");
    url.searchParams.set("tileDebug", "tile-ref-count");
    url.searchParams.set("tileSizePx", String(pair.tileSizePx));
    url.searchParams.set("maxRefsPerTile", String(pair.maxRefsPerTile));
    const id = candidateId(pair);
    return {
      id,
      title: `Tile ${pair.tileSizePx}px / cap ${pair.maxRefsPerTile}`,
      expectedRendererLabel: "tile-local-visible-debug-tile-ref-count",
      tileSizePx: pair.tileSizePx,
      maxRefsPerTile: pair.maxRefsPerTile,
      url: url.toString().replaceAll("%2F", "/"),
    };
  });
}

export function classifyTileBudgetSweep({ captures = [] } = {}) {
  const candidates = captures.map((capture) => classifyCandidate(capture));
  const baseline = candidates.find((candidate) => candidate.id === "tile-6px-cap-32") ?? null;
  for (const candidate of candidates) {
    candidate.status = classifyCandidateStatus(candidate, baseline);
  }
  const findings = [];
  for (const candidate of candidates) {
    if (!candidate.ready) {
      findings.push({
        kind: "candidate-not-ready",
        summary: `${candidate.id} did not report current tile-local sweep evidence.`,
      });
    }
    if (candidate.metrics.tileSizePx !== candidate.tileSizePx) {
      findings.push({
        kind: "tile-size-mismatch",
        summary: `${candidate.id} reported tileSizePx ${candidate.metrics.tileSizePx}.`,
      });
    }
    if (candidate.metrics.maxRefsPerTile !== candidate.maxRefsPerTile) {
      findings.push({
        kind: "cap-mismatch",
        summary: `${candidate.id} reported maxRefsPerTile ${candidate.metrics.maxRefsPerTile}.`,
      });
    }
  }
  if (!baseline) {
    findings.push({ kind: "missing-baseline", summary: "Sweep did not include the 6px/32-ref baseline." });
  }
  return {
    schemaVersion: 1,
    baseline,
    candidates,
    findings,
    recommendation: summarizeRecommendation(candidates),
    summary: {
      status: findings.length === 0 ? "PASS" : "BLOCKED",
      text: findings.length === 0
        ? "PASS: tile/cap sweep emitted stable budget metrics for each candidate."
        : `BLOCKED: ${findings[0].summary}`,
    },
  };
}

function classifyCandidate(capture) {
  const pair = {
    tileSizePx: Number(capture.tileSizePx),
    maxRefsPerTile: Number(capture.maxRefsPerTile),
  };
  const tileLocal = objectValue(capture.pageEvidence?.tileLocal);
  const budget = objectValue(tileLocal.budget);
  const diagnostics = objectValue(tileLocal.budgetDiagnostics);
  const arenaRefs = objectValue(diagnostics.arenaRefs);
  const heat = objectValue(diagnostics.heat);
  const cpuHeat = objectValue(heat.cpu);
  const gpuHeat = objectValue(heat.gpu);
  const tileColumns = finiteNumber(tileLocal.tileColumns) ?? 0;
  const tileRows = finiteNumber(tileLocal.tileRows) ?? 0;
  const metrics = {
    tileSizePx: finiteNumber(budget.tileSizePx) ?? pair.tileSizePx,
    maxRefsPerTile: finiteNumber(budget.maxRefsPerTile) ?? pair.maxRefsPerTile,
    tileCount: tileColumns * tileRows,
    tileColumns,
    tileRows,
    projectedRefs: finiteNumber(arenaRefs.projected) ?? 0,
    retainedRefs: finiteNumber(arenaRefs.retained) ?? finiteNumber(tileLocal.refs) ?? 0,
    droppedRefs: finiteNumber(arenaRefs.dropped) ?? 0,
    cappedTiles: finiteNumber(arenaRefs.cappedTileCount) ?? 0,
    buildTimeMs: finiteNumber(cpuHeat.buildDurationMs) ?? 0,
    renderTimeMs: finiteNumber(gpuHeat.renderDurationMs) ?? 0,
    fps: finiteNumber(capture.pageEvidence?.fps) ?? 0,
  };
  const ready =
    capture.classification?.harnessPassed === true &&
    tileLocal.status !== "stale-cache" &&
    metrics.tileCount > 0 &&
    metrics.retainedRefs > 0;
  return {
    id: candidateId(pair),
    tileSizePx: pair.tileSizePx,
    maxRefsPerTile: pair.maxRefsPerTile,
    rendererLabel: String(capture.pageEvidence?.rendererLabel ?? ""),
    ready,
    status: "underdetermined",
    metrics,
  };
}

function classifyCandidateStatus(candidate, baseline) {
  if (candidate.tileSizePx === 6 && candidate.maxRefsPerTile === 32) return "baseline";
  if (!candidate.ready) return "blocked";
  const metrics = candidate.metrics;
  if (metrics.retainedRefs <= 0 || metrics.tileCount <= 0) return "rejected";
  if (!baseline?.ready) return "underdetermined";
  const baselineMetrics = baseline.metrics;
  const lowersTileCount = metrics.tileCount < baselineMetrics.tileCount;
  const lowersBuildTime = metrics.buildTimeMs > 0 && metrics.buildTimeMs < baselineMetrics.buildTimeMs;
  const retainedRatio = baselineMetrics.retainedRefs > 0 ? metrics.retainedRefs / baselineMetrics.retainedRefs : 0;
  if (lowersTileCount && lowersBuildTime && retainedRatio >= 0.75) {
    return "plausible";
  }
  return "underdetermined";
}

function summarizeRecommendation(candidates) {
  const plausible = candidates.filter((candidate) => candidate.status === "plausible");
  if (plausible.length === 0) {
    return {
      status: "underdetermined",
      candidateIds: [],
      text: "No larger tile/cap pair cleared the baseline-relative metric heuristic; visual witness input is still required before any default change.",
    };
  }
  plausible.sort((left, right) =>
    left.metrics.tileCount - right.metrics.tileCount ||
    left.metrics.buildTimeMs - right.metrics.buildTimeMs ||
    right.metrics.retainedRefs - left.metrics.retainedRefs
  );
  return {
    status: "provisional",
    candidateIds: plausible.map((candidate) => candidate.id),
    text: `${plausible[0].id} is the strongest metric-only candidate; visual witness and G-buffer alignment must still confirm it before any default declaration.`,
  };
}

function candidateId(pair) {
  return `tile-${pair.tileSizePx}px-cap-${pair.maxRefsPerTile}`;
}

function objectValue(value) {
  return value && typeof value === "object" ? value : {};
}

function finiteNumber(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : undefined;
}
