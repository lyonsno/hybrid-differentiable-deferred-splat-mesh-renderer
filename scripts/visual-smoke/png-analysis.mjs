import { inflateSync } from "node:zlib";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function analyzePngBuffer(buffer, options = {}) {
  const image = decodePng(buffer);
  const background = options.backgroundColor ?? estimateCornerBackground(image);
  const pixelDeltaThreshold = options.pixelDeltaThreshold ?? 12;
  const minChangedPixelRatio = options.minChangedPixelRatio ?? 0.002;
  const minAverageDelta = options.minAverageDelta ?? 0.5;
  const minChangedPixels = options.minChangedPixels ?? 1;

  const distinct = new Set();
  let changedPixels = 0;
  let deltaSum = 0;

  for (let offset = 0; offset < image.rgba.length; offset += 4) {
    const r = image.rgba[offset];
    const g = image.rgba[offset + 1];
    const b = image.rgba[offset + 2];
    const a = image.rgba[offset + 3];
    distinct.add(`${r},${g},${b},${a}`);

    const delta = colorDelta([r, g, b, a], background);
    deltaSum += delta;
    if (delta >= pixelDeltaThreshold) {
      changedPixels += 1;
    }
  }

  const totalPixels = image.width * image.height;
  const changedPixelRatio = totalPixels === 0 ? 0 : changedPixels / totalPixels;
  const averageDelta = totalPixels === 0 ? 0 : deltaSum / totalPixels;
  const nonblank =
    changedPixels >= minChangedPixels &&
    changedPixelRatio >= minChangedPixelRatio &&
    averageDelta >= minAverageDelta &&
    distinct.size > 1;

  return {
    width: image.width,
    height: image.height,
    totalPixels,
    backgroundColor: {
      r: background[0],
      g: background[1],
      b: background[2],
      a: background[3],
    },
    distinctColorCount: distinct.size,
    changedPixels,
    changedPixelRatio,
    averageDelta,
    pixelDeltaThreshold,
    perceptualFingerprint: fingerprintImage({ width: image.width, height: image.height, rgba: image.rgba }, background),
    bridgeBlockRatio: estimateBridgeBlockRatio({ width: image.width, height: image.height, rgba: image.rgba }, background),
    nonblank,
  };
}

export function decodePng(buffer) {
  if (!Buffer.isBuffer(buffer)) {
    buffer = Buffer.from(buffer);
  }
  if (buffer.length < PNG_SIGNATURE.length || !buffer.subarray(0, 8).equals(PNG_SIGNATURE)) {
    throw new Error("Screenshot is not a PNG");
  }

  let offset = 8;
  let width = 0;
  let height = 0;
  let bitDepth = 0;
  let colorType = 0;
  const idatChunks = [];

  while (offset < buffer.length) {
    const length = buffer.readUInt32BE(offset);
    const type = buffer.toString("ascii", offset + 4, offset + 8);
    const dataStart = offset + 8;
    const dataEnd = dataStart + length;
    const data = buffer.subarray(dataStart, dataEnd);

    if (type === "IHDR") {
      width = data.readUInt32BE(0);
      height = data.readUInt32BE(4);
      bitDepth = data[8];
      colorType = data[9];
    } else if (type === "IDAT") {
      idatChunks.push(data);
    } else if (type === "IEND") {
      break;
    }

    offset = dataEnd + 4;
  }

  if (width <= 0 || height <= 0) {
    throw new Error("PNG is missing a valid IHDR");
  }
  if (bitDepth !== 8 || ![2, 6].includes(colorType)) {
    throw new Error(`Unsupported PNG format: bit depth ${bitDepth}, color type ${colorType}`);
  }

  const bytesPerPixel = colorType === 6 ? 4 : 3;
  const stride = width * bytesPerPixel;
  const raw = inflateSync(Buffer.concat(idatChunks));
  const rows = Buffer.alloc(height * stride);

  let rawOffset = 0;
  for (let y = 0; y < height; y += 1) {
    const filter = raw[rawOffset];
    rawOffset += 1;
    const rowStart = y * stride;
    const prevRowStart = y === 0 ? -1 : (y - 1) * stride;

    for (let x = 0; x < stride; x += 1) {
      const value = raw[rawOffset + x];
      const left = x >= bytesPerPixel ? rows[rowStart + x - bytesPerPixel] : 0;
      const up = prevRowStart >= 0 ? rows[prevRowStart + x] : 0;
      const upLeft = prevRowStart >= 0 && x >= bytesPerPixel ? rows[prevRowStart + x - bytesPerPixel] : 0;

      rows[rowStart + x] = unfilterByte(filter, value, left, up, upLeft);
    }
    rawOffset += stride;
  }

  const rgba = Buffer.alloc(width * height * 4);
  for (let source = 0, target = 0; source < rows.length; source += bytesPerPixel, target += 4) {
    rgba[target] = rows[source];
    rgba[target + 1] = rows[source + 1];
    rgba[target + 2] = rows[source + 2];
    rgba[target + 3] = colorType === 6 ? rows[source + 3] : 255;
  }

  return { width, height, rgba };
}

function estimateCornerBackground(image) {
  const samples = [
    readPixel(image, 0, 0),
    readPixel(image, image.width - 1, 0),
    readPixel(image, 0, image.height - 1),
    readPixel(image, image.width - 1, image.height - 1),
  ];

  return [0, 1, 2, 3].map((channel) =>
    Math.round(samples.reduce((sum, sample) => sum + sample[channel], 0) / samples.length)
  );
}

function readPixel(image, x, y) {
  const offset = (y * image.width + x) * 4;
  return [
    image.rgba[offset],
    image.rgba[offset + 1],
    image.rgba[offset + 2],
    image.rgba[offset + 3],
  ];
}

function colorDelta(pixel, background) {
  return (
    Math.abs(pixel[0] - background[0]) +
    Math.abs(pixel[1] - background[1]) +
    Math.abs(pixel[2] - background[2])
  ) / 3;
}

function fingerprintImage(image, background) {
  const columns = 8;
  const rows = 8;
  const cells = [];
  for (let cellY = 0; cellY < rows; cellY += 1) {
    for (let cellX = 0; cellX < columns; cellX += 1) {
      const startX = Math.floor((cellX * image.width) / columns);
      const endX = Math.floor(((cellX + 1) * image.width) / columns);
      const startY = Math.floor((cellY * image.height) / rows);
      const endY = Math.floor(((cellY + 1) * image.height) / rows);
      let sum = 0;
      let count = 0;
      for (let y = startY; y < endY; y += 1) {
        for (let x = startX; x < endX; x += 1) {
          sum += colorDelta(readPixel(image, x, y), background);
          count += 1;
        }
      }
      cells.push(Math.round((sum / Math.max(1, count)) / 8).toString(16).padStart(2, "0"));
    }
  }
  return cells.join("");
}

function estimateBridgeBlockRatio(image, background) {
  const blockSize = 16;
  let blockLike = 0;
  let sampled = 0;
  for (let y = 0; y + blockSize < image.height; y += blockSize) {
    for (let x = 0; x + blockSize < image.width; x += blockSize) {
      const center = readPixel(image, x + Math.floor(blockSize / 2), y + Math.floor(blockSize / 2));
      if (colorDelta(center, background) < 12) continue;
      sampled += 1;
      const corners = [
        readPixel(image, x, y),
        readPixel(image, x + blockSize - 1, y),
        readPixel(image, x, y + blockSize - 1),
        readPixel(image, x + blockSize - 1, y + blockSize - 1),
      ];
      const averageCornerDelta = corners.reduce((sum, corner) => sum + colorDelta(corner, center), 0) / corners.length;
      if (averageCornerDelta < 8) blockLike += 1;
    }
  }
  return sampled === 0 ? 0 : blockLike / sampled;
}

function unfilterByte(filter, value, left, up, upLeft) {
  switch (filter) {
    case 0:
      return value;
    case 1:
      return (value + left) & 0xff;
    case 2:
      return (value + up) & 0xff;
    case 3:
      return (value + Math.floor((left + up) / 2)) & 0xff;
    case 4:
      return (value + paeth(left, up, upLeft)) & 0xff;
    default:
      throw new Error(`Unsupported PNG filter ${filter}`);
  }
}

function paeth(left, up, upLeft) {
  const p = left + up - upLeft;
  const pa = Math.abs(p - left);
  const pb = Math.abs(p - up);
  const pc = Math.abs(p - upLeft);
  if (pa <= pb && pa <= pc) return left;
  if (pb <= pc) return up;
  return upLeft;
}
