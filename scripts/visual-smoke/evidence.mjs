const SYNTHETIC_PATTERNS = [/synthetic/i, /fixture/i, /test[-_ ]?cube/i, /placeholder/i];
const REAL_SPLAT_PATTERNS = [/scaniverse/i, /\bply\b/i, /\bspz\b/i, /real[-_ ]?splat/i, /phone[-_ ]?scan/i];

export function classifySmokeEvidence({ pageEvidence = {}, imageAnalysis = {}, requireRealSplat = false } = {}) {
  const normalized = normalizePageEvidence(pageEvidence);
  const nonblank = Boolean(imageAnalysis.nonblank);
  const reasons = [];

  if (!nonblank) {
    reasons.push("canvas screenshot is blank or indistinguishable from its background");
  }

  if (!normalized.splatCount || normalized.splatCount <= 0) {
    reasons.push("page evidence does not report a positive splat count");
  }

  if (normalized.synthetic) {
    reasons.push("page evidence is synthetic, fixture, or placeholder content");
  }

  if (!normalized.realSource) {
    reasons.push("page evidence does not identify real Scaniverse PLY/SPZ content");
  }

  const realSplatEvidence =
    nonblank &&
    normalized.splatCount > 0 &&
    normalized.realSource &&
    !normalized.synthetic;

  const closeable = nonblank && realSplatEvidence;
  const harnessPassed = nonblank && (!requireRealSplat || realSplatEvidence);

  if (requireRealSplat && !realSplatEvidence) {
    reasons.push("real Scaniverse splat evidence is required for first-smoke closure");
  }

  return {
    nonblank,
    realSplatEvidence,
    closeable,
    harnessPassed,
    sourceKind: normalized.sourceKind,
    splatCount: normalized.splatCount,
    assetPath: normalized.assetPath,
    summary: summarize({ nonblank, realSplatEvidence, closeable, normalized, requireRealSplat, reasons }),
    reasons: unique(reasons),
  };
}

export function normalizePageEvidence(pageEvidence = {}) {
  const sourceKind = stringValue(
    pageEvidence.sourceKind ??
      pageEvidence.source ??
      pageEvidence.kind ??
      pageEvidence.captureKind ??
      pageEvidence.smokeSourceKind
  );
  const assetPath = stringValue(pageEvidence.assetPath ?? pageEvidence.asset ?? pageEvidence.url ?? pageEvidence.sourcePath);
  const sourceText = [sourceKind, assetPath, stringValue(pageEvidence.description)].filter(Boolean).join(" ");
  const splatCount = numberValue(pageEvidence.splatCount ?? pageEvidence.count ?? pageEvidence.numSplats);
  const synthetic = Boolean(pageEvidence.synthetic) || SYNTHETIC_PATTERNS.some((pattern) => pattern.test(sourceText));
  const realSource =
    Boolean(pageEvidence.realSplatEvidence || pageEvidence.realScaniverse) ||
    REAL_SPLAT_PATTERNS.some((pattern) => pattern.test(sourceText));

  return {
    ...pageEvidence,
    sourceKind,
    assetPath,
    splatCount,
    synthetic,
    realSource,
  };
}

function summarize({ nonblank, realSplatEvidence, closeable, normalized, requireRealSplat, reasons }) {
  if (closeable && realSplatEvidence) {
    return `PASS: nonblank ${normalized.sourceKind || "real"} capture with ${normalized.splatCount} splats from ${
      normalized.assetPath || "reported Scaniverse source"
    }.`;
  }

  if (nonblank && !requireRealSplat) {
    return "PROVISIONAL: canvas is nonblank, but real Scaniverse splat evidence is not present.";
  }

  const firstReason = unique(reasons)[0] ?? "visual smoke criteria were not satisfied";
  return `FAIL: ${firstReason}.`;
}

function stringValue(value) {
  return typeof value === "string" && value.length > 0 ? value : "";
}

function numberValue(value) {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
}

function unique(values) {
  return [...new Set(values)];
}
