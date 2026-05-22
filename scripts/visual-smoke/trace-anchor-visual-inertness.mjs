import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import { deflateSync } from "node:zlib";
import { fileURLToPath } from "node:url";

import { decodePng } from "./png-analysis.mjs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function buildTraceAnchorVisualInertnessWitness({
  variants,
  target,
  cropRadius = 96,
  neighborhoodRadius = 4,
  differenceThreshold = 0,
}) {
  if (!Array.isArray(variants) || variants.length < 2) {
    throw new Error("At least baseline and traced variants are required");
  }
  const normalizedVariants = variants.map(normalizeVariant);
  const baseline = normalizedVariants[0];
  for (const variant of normalizedVariants.slice(1)) {
    assertSameDimensions(baseline.image, variant.image);
  }
  const normalizedTarget = normalizeTarget(target);
  assertTargetInImage(normalizedTarget, baseline.image);

  const crop = clampRect({
    x: normalizedTarget.x - cropRadius,
    y: normalizedTarget.y - cropRadius,
    width: cropRadius * 2 + 1,
    height: cropRadius * 2 + 1,
  }, baseline.image);
  const neighborhood = clampRect({
    x: normalizedTarget.x - neighborhoodRadius,
    y: normalizedTarget.y - neighborhoodRadius,
    width: neighborhoodRadius * 2 + 1,
    height: neighborhoodRadius * 2 + 1,
  }, baseline.image);
  const comparisons = normalizedVariants.slice(1).map((variant) =>
    compareVariantPair({ baseline, variant, target: normalizedTarget, crop, neighborhood, differenceThreshold })
  );
  const artifacts = buildArtifactImages({ variants: normalizedVariants, target: normalizedTarget, crop, differenceThreshold });

  return {
    comparisonClass: "trace-anchor-visual-inertness-witness",
    target: normalizedTarget,
    crop,
    neighborhood,
    wholeFrame: {
      width: baseline.image.width,
      height: baseline.image.height,
      totalPixels: baseline.image.width * baseline.image.height,
    },
    variants: normalizedVariants.map(({ image, ...variant }) => ({
      ...variant,
      image: { width: image.width, height: image.height },
    })),
    comparisons,
    classification: classifyComparisons(comparisons),
    artifacts,
  };
}

export function encodePng(image) {
  const normalized = normalizeImage(image);
  const rawStride = normalized.width * 4 + 1;
  const raw = Buffer.alloc(rawStride * normalized.height);
  for (let y = 0; y < normalized.height; y += 1) {
    const rawOffset = y * rawStride;
    raw[rawOffset] = 0;
    normalized.rgba.copy(raw, rawOffset + 1, y * normalized.width * 4, (y + 1) * normalized.width * 4);
  }
  return Buffer.concat([
    PNG_SIGNATURE,
    pngChunk("IHDR", ihdr(normalized.width, normalized.height)),
    pngChunk("IDAT", deflateSync(raw)),
    pngChunk("IEND", Buffer.alloc(0)),
  ]);
}

export function diffImage(before, after, differenceThreshold = 0) {
  assertSameDimensions(before, after);
  const image = normalizeImage(before);
  const next = normalizeImage(after);
  const rgba = Buffer.alloc(image.rgba.length);
  for (let offset = 0; offset < rgba.length; offset += 4) {
    const delta = [
      Math.abs(next.rgba[offset] - image.rgba[offset]),
      Math.abs(next.rgba[offset + 1] - image.rgba[offset + 1]),
      Math.abs(next.rgba[offset + 2] - image.rgba[offset + 2]),
      Math.abs(next.rgba[offset + 3] - image.rgba[offset + 3]),
    ];
    const changed = Math.max(delta[0], delta[1], delta[2], delta[3]) > differenceThreshold;
    rgba[offset] = changed ? Math.min(255, delta[0] * 3) : 0;
    rgba[offset + 1] = changed ? Math.min(255, delta[1] * 3) : 0;
    rgba[offset + 2] = changed ? Math.min(255, delta[2] * 3) : 0;
    rgba[offset + 3] = 255;
  }
  return { width: image.width, height: image.height, rgba };
}

function compareVariantPair({ baseline, variant, target, crop, neighborhood, differenceThreshold }) {
  const wholeFrame = compareRegion(baseline.image, variant.image, fullRect(baseline.image), differenceThreshold);
  const cropStats = compareRegion(baseline.image, variant.image, crop, differenceThreshold);
  const neighborhoodStats = compareRegion(baseline.image, variant.image, neighborhood, differenceThreshold);
  const outsideCrop = subtractRegionStats(wholeFrame, cropStats);
  const beforeTarget = pixelAt(baseline.image, target.x, target.y);
  const afterTarget = pixelAt(variant.image, target.x, target.y);
  const targetDelta = channelDelta(beforeTarget, afterTarget);

  return {
    beforeVariantId: baseline.id,
    afterVariantId: variant.id,
    wholeFrame,
    crop: cropStats,
    outsideCrop,
    target: {
      id: target.id,
      x: target.x,
      y: target.y,
      before: { variantId: baseline.id, rgba8: beforeTarget },
      after: { variantId: variant.id, rgba8: afterTarget },
      deltaRgba8: targetDelta,
      rgbLumaDelta: rgbAverageDelta(targetDelta),
    },
    neighborhood: {
      radius: Math.floor((neighborhood.width - 1) / 2),
      before: summarizeRegion(baseline.image, neighborhood),
      after: summarizeRegion(variant.image, neighborhood),
      delta: neighborhoodStats,
    },
  };
}

function compareRegion(beforeImage, afterImage, rect, differenceThreshold) {
  const before = normalizeImage(beforeImage);
  const after = normalizeImage(afterImage);
  let changedPixels = 0;
  let totalRgbDelta = 0;
  let maxRgbDelta = 0;
  let maxChannelDelta = 0;

  forEachPixel(rect, (x, y) => {
    const beforePixel = pixelAt(before, x, y);
    const afterPixel = pixelAt(after, x, y);
    const delta = channelDelta(beforePixel, afterPixel);
    const rgbDelta = rgbAverageDelta(delta);
    const pixelMaxChannelDelta = Math.max(...delta);
    totalRgbDelta += rgbDelta;
    maxRgbDelta = Math.max(maxRgbDelta, rgbDelta);
    maxChannelDelta = Math.max(maxChannelDelta, pixelMaxChannelDelta);
    if (pixelMaxChannelDelta > differenceThreshold) changedPixels += 1;
  });

  const totalPixels = rect.width * rect.height;
  return {
    ...rect,
    totalPixels,
    changedPixels,
    changedPixelRatio: totalPixels === 0 ? 0 : changedPixels / totalPixels,
    averageRgbDelta: totalPixels === 0 ? 0 : Number((totalRgbDelta / totalPixels).toFixed(6)),
    maxRgbDelta,
    maxChannelDelta,
  };
}

function summarizeRegion(image, rect) {
  const channels = [0, 0, 0, 0];
  let minRgbLuma = Infinity;
  let maxRgbLuma = -Infinity;
  forEachPixel(rect, (x, y) => {
    const pixel = pixelAt(image, x, y);
    for (let channel = 0; channel < 4; channel += 1) channels[channel] += pixel[channel];
    const luma = Math.round((pixel[0] + pixel[1] + pixel[2]) / 3);
    minRgbLuma = Math.min(minRgbLuma, luma);
    maxRgbLuma = Math.max(maxRgbLuma, luma);
  });
  const totalPixels = rect.width * rect.height;
  return {
    ...rect,
    totalPixels,
    meanRgba8: channels.map((sum) => Math.round(sum / Math.max(1, totalPixels))),
    minRgbLuma: Number.isFinite(minRgbLuma) ? minRgbLuma : 0,
    maxRgbLuma: Number.isFinite(maxRgbLuma) ? maxRgbLuma : 0,
  };
}

function subtractRegionStats(wholeFrame, crop) {
  const totalPixels = Math.max(0, wholeFrame.totalPixels - crop.totalPixels);
  const changedPixels = Math.max(0, wholeFrame.changedPixels - crop.changedPixels);
  return {
    totalPixels,
    changedPixels,
    changedPixelRatio: totalPixels === 0 ? 0 : changedPixels / totalPixels,
  };
}

function buildArtifactImages({ variants, target, crop, differenceThreshold }) {
  const baseline = variants[0];
  const comparisons = variants.slice(1).map((variant) => diffImage(baseline.image, variant.image, differenceThreshold));
  const fullFramePanels = [baseline.image, ...variants.slice(1).map((variant) => variant.image), ...comparisons];
  const croppedPanels = fullFramePanels.map((image) => cropImage(image, crop));
  return {
    fullFrameContactSheet: horizontalContactSheet(fullFramePanels),
    fullFrameDiff: comparisons[0],
    cropContactSheet: horizontalContactSheet(croppedPanels),
    cropDiff: cropImage(comparisons[0], crop),
    targetMarker: { x: target.x, y: target.y },
  };
}

function classifyComparisons(comparisons) {
  if (comparisons.every((comparison) => comparison.wholeFrame.changedPixels === 0 && comparison.target.rgbLumaDelta === 0)) {
    return "trace-anchor-visually-inert";
  }
  if (comparisons.some((comparison) => comparison.outsideCrop.changedPixels > 0)) {
    return "trace-anchor-global-route-perturbation";
  }
  if (comparisons.some((comparison) => comparison.crop.changedPixels > 0 || comparison.target.rgbLumaDelta > 0)) {
    return "trace-anchor-local-perturbation";
  }
  return "trace-observation-underinstrumented";
}

function cropImage(image, rect) {
  const normalized = normalizeImage(image);
  const rgba = Buffer.alloc(rect.width * rect.height * 4);
  for (let y = 0; y < rect.height; y += 1) {
    const sourceStart = ((rect.y + y) * normalized.width + rect.x) * 4;
    const targetStart = y * rect.width * 4;
    normalized.rgba.copy(rgba, targetStart, sourceStart, sourceStart + rect.width * 4);
  }
  return { width: rect.width, height: rect.height, rgba };
}

function horizontalContactSheet(images) {
  const normalized = images.map(normalizeImage);
  const width = normalized.reduce((sum, image) => sum + image.width, 0);
  const height = Math.max(...normalized.map((image) => image.height));
  const rgba = Buffer.alloc(width * height * 4, 255);
  let xOffset = 0;
  for (const image of normalized) {
    for (let y = 0; y < image.height; y += 1) {
      const sourceStart = y * image.width * 4;
      const targetStart = (y * width + xOffset) * 4;
      image.rgba.copy(rgba, targetStart, sourceStart, sourceStart + image.width * 4);
    }
    xOffset += image.width;
  }
  return { width, height, rgba };
}

function normalizeVariant(variant) {
  if (!variant || typeof variant !== "object") throw new Error("Variant must be an object");
  if (!variant.id) throw new Error("Variant id is required");
  return {
    id: String(variant.id),
    title: variant.title ? String(variant.title) : String(variant.id),
    route: variant.route ?? {},
    image: normalizeImage(variant.image),
  };
}

function normalizeImage(image) {
  if (!image || typeof image !== "object") throw new Error("Image is required");
  if (!Number.isInteger(image.width) || image.width <= 0) throw new Error("Image width must be a positive integer");
  if (!Number.isInteger(image.height) || image.height <= 0) throw new Error("Image height must be a positive integer");
  const rgba = Buffer.isBuffer(image.rgba) ? image.rgba : Buffer.from(image.rgba ?? []);
  if (rgba.length !== image.width * image.height * 4) {
    throw new Error(`Image RGBA length ${rgba.length} does not match ${image.width}x${image.height}`);
  }
  return { width: image.width, height: image.height, rgba };
}

function normalizeTarget(target) {
  if (!target || typeof target !== "object") throw new Error("Target is required");
  const x = Number(target.x);
  const y = Number(target.y);
  if (!Number.isInteger(x) || !Number.isInteger(y)) throw new Error("Target x/y must be integer pixels");
  return { id: target.id ? String(target.id) : `target@${x},${y}`, x, y };
}

function assertSameDimensions(left, right) {
  if (left.width !== right.width || left.height !== right.height) {
    throw new Error(`Image dimensions differ: ${left.width}x${left.height} vs ${right.width}x${right.height}`);
  }
}

function assertTargetInImage(target, image) {
  if (target.x < 0 || target.x >= image.width || target.y < 0 || target.y >= image.height) {
    throw new Error(`Target ${target.id}@${target.x},${target.y} is outside ${image.width}x${image.height}`);
  }
}

function fullRect(image) {
  return { x: 0, y: 0, width: image.width, height: image.height };
}

function clampRect(rect, image) {
  const x = Math.max(0, Math.min(image.width - 1, rect.x));
  const y = Math.max(0, Math.min(image.height - 1, rect.y));
  const right = Math.max(x + 1, Math.min(image.width, rect.x + rect.width));
  const bottom = Math.max(y + 1, Math.min(image.height, rect.y + rect.height));
  return { x, y, width: right - x, height: bottom - y };
}

function forEachPixel(rect, callback) {
  for (let y = rect.y; y < rect.y + rect.height; y += 1) {
    for (let x = rect.x; x < rect.x + rect.width; x += 1) {
      callback(x, y);
    }
  }
}

function pixelAt(image, x, y) {
  const normalized = normalizeImage(image);
  const offset = (y * normalized.width + x) * 4;
  return [
    normalized.rgba[offset],
    normalized.rgba[offset + 1],
    normalized.rgba[offset + 2],
    normalized.rgba[offset + 3],
  ];
}

function channelDelta(before, after) {
  return before.map((channel, index) => Math.abs(after[index] - channel));
}

function rgbAverageDelta(deltaRgba8) {
  return Math.round((deltaRgba8[0] + deltaRgba8[1] + deltaRgba8[2]) / 3);
}

function ihdr(width, height) {
  const buffer = Buffer.alloc(13);
  buffer.writeUInt32BE(width, 0);
  buffer.writeUInt32BE(height, 4);
  buffer[8] = 8;
  buffer[9] = 6;
  buffer[10] = 0;
  buffer[11] = 0;
  buffer[12] = 0;
  return buffer;
}

function pngChunk(type, data) {
  const typeBuffer = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crcBuffer = Buffer.alloc(4);
  crcBuffer.writeUInt32BE(crc32(Buffer.concat([typeBuffer, data])), 0);
  return Buffer.concat([length, typeBuffer, data, crcBuffer]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let bit = 0; bit < 8; bit += 1) {
      crc = (crc >>> 1) ^ (0xedb88320 & -(crc & 1));
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

async function runCli(args) {
  const options = parseArgs(args);
  await mkdir(options.outDir, { recursive: true });
  const variants = [];
  variants.push(await loadVariant({
    id: options.baselineId,
    title: options.baselineTitle,
    imagePath: options.baselineImage,
    analysisPath: options.baselineAnalysis,
  }));
  variants.push(await loadVariant({
    id: options.tracedId,
    title: options.tracedTitle,
    imagePath: options.tracedImage,
    analysisPath: options.tracedAnalysis,
  }));
  if (options.intermediateImage) {
    variants.push(await loadVariant({
      id: options.intermediateId,
      title: options.intermediateTitle,
      imagePath: options.intermediateImage,
      analysisPath: options.intermediateAnalysis,
    }));
  }

  const witness = buildTraceAnchorVisualInertnessWitness({
    variants,
    target: options.target,
    cropRadius: options.cropRadius,
    neighborhoodRadius: options.neighborhoodRadius,
    differenceThreshold: options.differenceThreshold,
  });
  const artifactPaths = {
    fullFrameContactSheet: path.join(options.outDir, "trace-anchor-full-frame-contact-sheet.png"),
    fullFrameDiff: path.join(options.outDir, "trace-anchor-full-frame-diff.png"),
    cropContactSheet: path.join(options.outDir, "trace-anchor-crop-contact-sheet.png"),
    cropDiff: path.join(options.outDir, "trace-anchor-crop-diff.png"),
    analysis: path.join(options.outDir, "trace-anchor-visual-inertness-analysis.json"),
  };

  await writeFile(artifactPaths.fullFrameContactSheet, encodePng(witness.artifacts.fullFrameContactSheet));
  await writeFile(artifactPaths.fullFrameDiff, encodePng(witness.artifacts.fullFrameDiff));
  await writeFile(artifactPaths.cropContactSheet, encodePng(witness.artifacts.cropContactSheet));
  await writeFile(artifactPaths.cropDiff, encodePng(witness.artifacts.cropDiff));

  const serializableWitness = {
    ...witness,
    artifacts: {
      fullFrameContactSheet: path.relative(process.cwd(), artifactPaths.fullFrameContactSheet),
      fullFrameDiff: path.relative(process.cwd(), artifactPaths.fullFrameDiff),
      cropContactSheet: path.relative(process.cwd(), artifactPaths.cropContactSheet),
      cropDiff: path.relative(process.cwd(), artifactPaths.cropDiff),
      targetMarker: witness.artifacts.targetMarker,
    },
  };
  await writeFile(artifactPaths.analysis, `${JSON.stringify(serializableWitness, null, 2)}\n`);
  console.log(`classification: ${witness.classification}`);
  console.log(`analysis: ${path.relative(process.cwd(), artifactPaths.analysis)}`);
  console.log(`full-frame contact sheet: ${path.relative(process.cwd(), artifactPaths.fullFrameContactSheet)}`);
  console.log(`crop contact sheet: ${path.relative(process.cwd(), artifactPaths.cropContactSheet)}`);
}

async function loadVariant({ id, title, imagePath, analysisPath }) {
  if (!imagePath) throw new Error(`Missing image path for ${id}`);
  const image = decodePng(await readFile(imagePath));
  const analysis = analysisPath ? JSON.parse(await readFile(analysisPath, "utf8")) : {};
  return {
    id,
    title,
    image,
    route: routeIdentityFromAnalysis(analysis),
  };
}

function routeIdentityFromAnalysis(analysis) {
  const pageEvidence = analysis.pageEvidence ?? {};
  const liveTrace = pageEvidence.witness?.livePixelPatchTrace;
  return {
    url: analysis.url,
    traceAnchors: new URL(analysis.url ?? "http://invalid/").searchParams.get("traceAnchors") ?? "",
    asset: new URL(analysis.url ?? "http://invalid/").searchParams.get("asset") ?? pageEvidence.assetPath ?? null,
    witnessView: new URL(analysis.url ?? "http://invalid/").searchParams.get("witnessView") ?? null,
    requestedRenderer: new URL(analysis.url ?? "http://invalid/").searchParams.get("renderer") ?? null,
    effectiveRenderer: pageEvidence.rendererLabel ?? liveTrace?.routeIdentity?.effectiveRenderer ?? null,
    requestedArenaBackend: new URL(analysis.url ?? "http://invalid/").searchParams.get("arenaBackend") ?? null,
    effectiveArenaBackend: pageEvidence.arenaRuntime?.effectiveArenaBackend ?? liveTrace?.routeIdentity?.effectiveArenaBackend ?? null,
    tileSizePx: Number(new URL(analysis.url ?? "http://invalid/").searchParams.get("tileSizePx") ?? pageEvidence.tileLocal?.budget?.tileSizePx ?? NaN) || null,
    maxRefsPerTile: Number(new URL(analysis.url ?? "http://invalid/").searchParams.get("maxRefsPerTile") ?? pageEvidence.tileLocal?.budget?.maxRefsPerTile ?? NaN) || null,
    viewport: analysis.options?.viewport ?? liveTrace?.routeIdentity?.viewport ?? null,
    backingScale: liveTrace?.routeIdentity?.backingScale ?? null,
    frameId: pageEvidence.tileLocal?.outputTextureReadback?.frameId ?? pageEvidence.tileLocal?.compositorInputReadback?.frameId ?? null,
    debugMode: pageEvidence.tileLocal?.debugMode ?? null,
    branch: liveTrace?.routeIdentity?.branch ?? null,
    commit: liveTrace?.routeIdentity?.commit ?? null,
  };
}

function parseArgs(args) {
  const options = {
    baselineId: "baseline",
    baselineTitle: "Baseline/no traceAnchors",
    tracedId: "traced-dark-lacuna",
    tracedTitle: "Traced dark-lacuna anchor route",
    intermediateId: "intermediate",
    intermediateTitle: "Intermediate trace route",
    outDir: "smoke-reports/trace-anchor-visual-inertness-witness",
    cropRadius: 96,
    neighborhoodRadius: 4,
    differenceThreshold: 0,
  };
  for (let index = 0; index < args.length; index += 1) {
    const arg = args[index];
    const next = () => {
      index += 1;
      if (index >= args.length) throw new Error(`Missing value for ${arg}`);
      return args[index];
    };
    switch (arg) {
      case "--baseline-image":
        options.baselineImage = next();
        break;
      case "--baseline-analysis":
        options.baselineAnalysis = next();
        break;
      case "--baseline-id":
        options.baselineId = next();
        break;
      case "--baseline-title":
        options.baselineTitle = next();
        break;
      case "--traced-image":
        options.tracedImage = next();
        break;
      case "--traced-analysis":
        options.tracedAnalysis = next();
        break;
      case "--traced-id":
        options.tracedId = next();
        break;
      case "--traced-title":
        options.tracedTitle = next();
        break;
      case "--intermediate-image":
        options.intermediateImage = next();
        break;
      case "--intermediate-analysis":
        options.intermediateAnalysis = next();
        break;
      case "--intermediate-id":
        options.intermediateId = next();
        break;
      case "--intermediate-title":
        options.intermediateTitle = next();
        break;
      case "--target":
        options.target = parseTarget(next());
        break;
      case "--crop-radius":
        options.cropRadius = Number(next());
        break;
      case "--neighborhood-radius":
        options.neighborhoodRadius = Number(next());
        break;
      case "--difference-threshold":
        options.differenceThreshold = Number(next());
        break;
      case "--out-dir":
        options.outDir = next();
        break;
      case "--help":
      case "-h":
        printHelp();
        process.exit(0);
        break;
      default:
        throw new Error(`Unknown argument: ${arg}`);
    }
  }
  if (!options.target) throw new Error("Missing --target id@x,y");
  return options;
}

function parseTarget(value) {
  const match = /^([^@]+)@(\d+),(\d+)$/.exec(value);
  if (!match) throw new Error(`Invalid target ${value}; expected id@x,y`);
  return { id: match[1], x: Number(match[2]), y: Number(match[3]) };
}

function printHelp() {
  console.log(`Usage: node scripts/visual-smoke/trace-anchor-visual-inertness.mjs \\
  --baseline-image smoke-reports/baseline/canvas.png \\
  --baseline-analysis smoke-reports/baseline/analysis.json \\
  --traced-image smoke-reports/traced/canvas.png \\
  --traced-analysis smoke-reports/traced/analysis.json \\
  --target dark-lacunar-hole@2008,928 \\
  --out-dir smoke-reports/trace-anchor-visual-inertness-witness`);
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
  runCli(process.argv.slice(2)).catch((error) => {
    console.error(error.stack || error.message);
    process.exit(1);
  });
}
