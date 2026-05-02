/**
 * pixel-shape-analysis.mjs
 *
 * Geometric shape analysis utilities for rendered PNG/canvas pixel buffers.
 * Operates on raw RGBA Uint8Array/Buffer data, not on renderer internals.
 *
 * Core flow:
 *   extractForegroundMask() → computeBoundingBox() / computeCentroid() /
 *   computePrincipalAxes() / computeThicknessRatio()
 *
 * All-in-one: analyzeShape()
 * Suppression: computeForegroundSuppression()
 *
 * Tolerance for "foreground" detection mirrors analyzePngBuffer() from
 * png-analysis.mjs: a pixel is foreground when its per-channel mean delta
 * from the estimated background exceeds pixelDeltaThreshold (default 12).
 */

import { decodePng } from "./png-analysis.mjs";

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Extract a binary foreground mask from a decoded RGBA buffer.
 *
 * options:
 *   backgroundColor?: [r, g, b, a]  — override background estimation
 *   pixelDeltaThreshold?: number    — foreground delta threshold (default 12)
 *
 * Returns:
 *   mask:          Uint8Array, length = width * height, 1 = foreground, 0 = background
 *   changedPixels: number of foreground pixels
 */
export function extractForegroundMask(rgba, width, height, options = {}) {
  const background = options.backgroundColor ?? estimateCornerBackground(rgba, width, height);
  const threshold = options.pixelDeltaThreshold ?? 12;

  const totalPixels = width * height;
  const mask = new Uint8Array(totalPixels);
  let changedPixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const delta = channelMeanDelta(
      rgba[offset],
      rgba[offset + 1],
      rgba[offset + 2],
      background
    );
    if (delta >= threshold) {
      mask[i] = 1;
      changedPixels += 1;
    }
  }

  return { mask, changedPixels };
}

/**
 * Compute the axis-aligned bounding box of the foreground region.
 *
 * Returns: { minX, minY, maxX, maxY, width, height }
 * When no foreground pixels exist, all fields are 0.
 */
export function computeBoundingBox(mask, width, height) {
  let minX = width;
  let minY = height;
  let maxX = -1;
  let maxY = -1;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        if (x < minX) minX = x;
        if (x > maxX) maxX = x;
        if (y < minY) minY = y;
        if (y > maxY) maxY = y;
      }
    }
  }

  if (maxX < 0) {
    return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0 };
  }

  return {
    minX,
    minY,
    maxX,
    maxY,
    width: maxX - minX + 1,
    height: maxY - minY + 1,
  };
}

/**
 * Compute the center of mass (centroid) of the foreground pixels.
 *
 * Returns: { x: number, y: number }
 * Returns center of image when no foreground pixels exist.
 */
export function computeCentroid(mask, width, height) {
  let sumX = 0;
  let sumY = 0;
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        sumX += x;
        sumY += y;
        count += 1;
      }
    }
  }

  if (count === 0) {
    return { x: width / 2, y: height / 2 };
  }

  return { x: sumX / count, y: sumY / count };
}

/**
 * Extract principal axes via second central moment (image moments) analysis.
 *
 * Computes the 2x2 covariance matrix of foreground pixel coordinates,
 * then extracts eigenvalues and eigenvectors.
 *
 * Returns:
 *   angleDeg:    orientation of the major axis in degrees (−90 to +90)
 *   majorLength: half-length along major axis (sqrt of major eigenvalue)
 *   minorLength: half-length along minor axis (sqrt of minor eigenvalue)
 *
 * When there are fewer than 2 foreground pixels, returns zero-filled result.
 */
export function computePrincipalAxes(mask, width, height) {
  const { x: cx, y: cy } = computeCentroid(mask, width, height);

  let m20 = 0; // sum of (x - cx)^2
  let m02 = 0; // sum of (y - cy)^2
  let m11 = 0; // sum of (x - cx)(y - cy)
  let count = 0;

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (mask[y * width + x]) {
        const dx = x - cx;
        const dy = y - cy;
        m20 += dx * dx;
        m02 += dy * dy;
        m11 += dx * dy;
        count += 1;
      }
    }
  }

  if (count < 2) {
    return { angleDeg: 0, majorLength: 0, minorLength: 0 };
  }

  // Normalized central moments (covariance matrix entries).
  const cxx = m20 / count;
  const cyy = m02 / count;
  const cxy = m11 / count;

  // Eigenvalues of the 2x2 covariance matrix [[cxx, cxy], [cxy, cyy]].
  const trace = cxx + cyy;
  const det = cxx * cyy - cxy * cxy;
  const discriminant = Math.max(0, (trace / 2) ** 2 - det);
  const sqrtDisc = Math.sqrt(discriminant);

  const lambda1 = trace / 2 + sqrtDisc; // major eigenvalue
  const lambda2 = trace / 2 - sqrtDisc; // minor eigenvalue

  // Orientation of major axis: angle of the eigenvector for lambda1.
  // atan2(cxy, lambda1 - cyy) gives the angle of that eigenvector.
  const angle = 0.5 * Math.atan2(2 * cxy, cxx - cyy); // radians, in [-π/2, π/2]
  const angleDeg = (angle * 180) / Math.PI;

  return {
    angleDeg,
    majorLength: Math.sqrt(Math.max(0, lambda1)),
    minorLength: Math.sqrt(Math.max(0, lambda2)),
  };
}

/**
 * Compute thickness ratio = minorLength / majorLength.
 *
 * A circle has ratio ≈ 1.0; a thin line has ratio ≈ 0.
 * Returns 1.0 when there are no foreground pixels (degenerate).
 */
export function computeThicknessRatio(mask, width, height) {
  const { majorLength, minorLength } = computePrincipalAxes(mask, width, height);
  if (majorLength < 1e-9) return 1.0;
  return minorLength / majorLength;
}

/**
 * All-in-one shape analysis from a raw PNG buffer or RGBA buffer.
 *
 * Accepts either:
 *   - a Buffer/Uint8Array representing an encoded PNG (auto-decoded), or
 *   - a pre-decoded RGBA buffer when width and height are provided
 *
 * options:
 *   backgroundColor?: [r, g, b, a]
 *   pixelDeltaThreshold?: number
 *
 * Returns:
 *   mask:          { changedPixels, changedPixelRatio }
 *   boundingBox:   { minX, minY, maxX, maxY, width, height }
 *   centroid:      { x, y }
 *   principalAxes: { angleDeg, majorLength, minorLength }
 *   thicknessRatio: number
 *   aspectRatio:   bounding-box width / height (0 when height === 0)
 */
export function analyzeShape(rgbaOrPng, width, height, options = {}) {
  let rgba;

  if (typeof width !== "number" || typeof height !== "number") {
    // Called as analyzeShape(pngBuffer) — decode first.
    const decoded = decodePng(rgbaOrPng);
    rgba = decoded.rgba;
    width = decoded.width;
    height = decoded.height;
  } else {
    // Called as analyzeShape(rgba, width, height) — check whether it's a PNG
    // buffer (RGBA expected to be raw) or need decode.
    // Heuristic: if the first 8 bytes match the PNG signature, decode it.
    const buf = Buffer.isBuffer(rgbaOrPng) ? rgbaOrPng : Buffer.from(rgbaOrPng);
    const PNG_SIG = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
    if (buf.length >= 8 && buf.subarray(0, 8).equals(PNG_SIG)) {
      const decoded = decodePng(buf);
      rgba = decoded.rgba;
      width = decoded.width;
      height = decoded.height;
    } else {
      rgba = buf;
    }
  }

  const totalPixels = width * height;
  const { mask, changedPixels } = extractForegroundMask(rgba, width, height, options);
  const changedPixelRatio = totalPixels === 0 ? 0 : changedPixels / totalPixels;
  const boundingBox = computeBoundingBox(mask, width, height);
  const centroid = computeCentroid(mask, width, height);
  const principalAxes = computePrincipalAxes(mask, width, height);
  const thicknessRatio = computeThicknessRatio(mask, width, height);
  const aspectRatio =
    boundingBox.height === 0 ? 0 : boundingBox.width / boundingBox.height;

  return {
    mask: { changedPixels, changedPixelRatio },
    boundingBox,
    centroid,
    principalAxes,
    thicknessRatio,
    aspectRatio,
  };
}

/**
 * Compute foreground suppression ratio.
 *
 * Measures what fraction of the image area has been "hidden" by opaque
 * foreground relative to a known background reference image.
 *
 * A pixel is "suppressed" when:
 *   - the background reference pixel is bright (delta from neutral > suppressionBackgroundThreshold), AND
 *   - the rendered pixel is significantly darker / different from the background
 *     (delta between rendered and background > suppressionFgThreshold)
 *
 * options:
 *   suppressionBackgroundThreshold?: number  — min delta to call a pixel "bright background" (default 40)
 *   suppressionFgThreshold?: number          — min delta from background to call it suppressed (default 30)
 *
 * Returns: { suppressionRatio: number } where 1.0 means all background is hidden.
 */
export function computeForegroundSuppression(rgba, width, height, backgroundRgba, options = {}) {
  const bgThreshold = options.suppressionBackgroundThreshold ?? 40;
  const fgThreshold = options.suppressionFgThreshold ?? 30;

  // Neutral reference for "bright background" check: mid-gray.
  const neutral = [128, 128, 128];

  const totalPixels = width * height;
  let brightBackgroundPixels = 0;
  let suppressedPixels = 0;

  for (let i = 0; i < totalPixels; i++) {
    const offset = i * 4;
    const bgR = backgroundRgba[offset];
    const bgG = backgroundRgba[offset + 1];
    const bgB = backgroundRgba[offset + 2];

    // Is this a bright background pixel?
    const bgDeltaFromNeutral =
      (Math.abs(bgR - neutral[0]) + Math.abs(bgG - neutral[1]) + Math.abs(bgB - neutral[2])) / 3;
    if (bgDeltaFromNeutral < bgThreshold) continue;

    brightBackgroundPixels += 1;

    // Is the rendered pixel significantly different from background?
    const rendR = rgba[offset];
    const rendG = rgba[offset + 1];
    const rendB = rgba[offset + 2];
    const deltaFromBg =
      (Math.abs(rendR - bgR) + Math.abs(rendG - bgG) + Math.abs(rendB - bgB)) / 3;

    if (deltaFromBg >= fgThreshold) {
      suppressedPixels += 1;
    }
  }

  const suppressionRatio =
    brightBackgroundPixels === 0 ? 0 : suppressedPixels / brightBackgroundPixels;

  return { suppressionRatio };
}

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

/**
 * Estimate background color from the four corners of the image.
 * Returns [r, g, b, a] as rounded average.
 */
function estimateCornerBackground(rgba, width, height) {
  const corners = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
  ];

  const sums = [0, 0, 0, 0];
  for (const [x, y] of corners) {
    const offset = (y * width + x) * 4;
    sums[0] += rgba[offset];
    sums[1] += rgba[offset + 1];
    sums[2] += rgba[offset + 2];
    sums[3] += rgba[offset + 3];
  }

  return sums.map((s) => Math.round(s / corners.length));
}

/**
 * Per-channel mean delta between a pixel [r, g, b] and background [r, g, b, a].
 * Alpha is not included in the delta (matches analyzePngBuffer behavior).
 */
function channelMeanDelta(r, g, b, background) {
  return (
    Math.abs(r - background[0]) +
    Math.abs(g - background[1]) +
    Math.abs(b - background[2])
  ) / 3;
}
