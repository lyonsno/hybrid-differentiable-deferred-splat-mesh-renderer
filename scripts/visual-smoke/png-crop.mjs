import { Buffer } from "node:buffer";
import { deflateSync } from "node:zlib";

import { decodePng } from "./png-analysis.mjs";

const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);

export function cropPngBuffer(buffer, cropBox) {
  const image = decodePng(buffer);
  const box = normalizeCropBox(cropBox, image.width, image.height);
  const rgba = Buffer.alloc(box.width * box.height * 4, 0);
  const sourceX0 = Math.max(0, box.x);
  const sourceY0 = Math.max(0, box.y);
  const sourceX1 = Math.min(image.width, box.x + box.width);
  const sourceY1 = Math.min(image.height, box.y + box.height);

  for (let sourceY = sourceY0; sourceY < sourceY1; sourceY += 1) {
    const targetY = sourceY - box.y;
    for (let sourceX = sourceX0; sourceX < sourceX1; sourceX += 1) {
      const targetX = sourceX - box.x;
      const sourceOffset = (sourceY * image.width + sourceX) * 4;
      const targetOffset = (targetY * box.width + targetX) * 4;
      rgba[targetOffset] = image.rgba[sourceOffset];
      rgba[targetOffset + 1] = image.rgba[sourceOffset + 1];
      rgba[targetOffset + 2] = image.rgba[sourceOffset + 2];
      rgba[targetOffset + 3] = image.rgba[sourceOffset + 3];
    }
  }

  return {
    png: encodePng(rgba, box.width, box.height),
    box,
    clipped: sourceX0 !== box.x || sourceY0 !== box.y || sourceX1 !== box.x + box.width || sourceY1 !== box.y + box.height,
  };
}

export function normalizeCropBox(cropBox, imageWidth, imageHeight) {
  const width = Math.max(1, Math.round(Number(cropBox.width)));
  const height = Math.max(1, Math.round(Number(cropBox.height)));
  const x = Math.round(Number(cropBox.x));
  const y = Math.round(Number(cropBox.y));
  if (!Number.isFinite(width) || !Number.isFinite(height) || !Number.isFinite(x) || !Number.isFinite(y)) {
    throw new Error(`Invalid crop box: ${JSON.stringify(cropBox)}`);
  }

  return {
    x,
    y,
    width,
    height,
    imageWidth,
    imageHeight,
  };
}

export function centerCropBox(x, y, width, height) {
  return {
    x: Math.round(x - width / 2),
    y: Math.round(y - height / 2),
    width,
    height,
  };
}

function encodePng(rgba, width, height) {
  const rows = [];
  for (let y = 0; y < height; y += 1) {
    const row = Buffer.alloc(1 + width * 4);
    row[0] = 0;
    const start = y * width * 4;
    rgba.copy(row, 1, start, start + width * 4);
    rows.push(row);
  }

  return Buffer.concat([
    PNG_SIGNATURE,
    chunk("IHDR", createIhdr(width, height)),
    chunk("IDAT", deflateSync(Buffer.concat(rows))),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}

function createIhdr(width, height) {
  const data = Buffer.alloc(13);
  data.writeUInt32BE(width, 0);
  data.writeUInt32BE(height, 4);
  data[8] = 8;
  data[9] = 6;
  data[10] = 0;
  data[11] = 0;
  data[12] = 0;
  return data;
}

function chunk(type, data) {
  const typeBytes = Buffer.from(type, "ascii");
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(Buffer.concat([typeBytes, data])), 0);
  return Buffer.concat([length, typeBytes, data, crc]);
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) {
    crc ^= byte;
    for (let i = 0; i < 8; i += 1) {
      crc = crc & 1 ? 0xedb88320 ^ (crc >>> 1) : crc >>> 1;
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}
