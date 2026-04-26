export interface TimestampHelper {
  querySet: GPUQuerySet;
  resolveBuffer: GPUBuffer;
  readBuffer: GPUBuffer;
  capacity: number;
  labels: string[];
  mapping: boolean;
}

export function createTimestamps(
  device: GPUDevice,
  supported: boolean,
  capacity = 16
): TimestampHelper | null {
  if (!supported) return null;

  const querySet = device.createQuerySet({
    type: "timestamp",
    count: capacity,
  });

  const resolveBuffer = device.createBuffer({
    size: capacity * 8,
    usage: GPUBufferUsage.QUERY_RESOLVE | GPUBufferUsage.COPY_SRC,
  });

  const readBuffer = device.createBuffer({
    size: capacity * 8,
    usage: GPUBufferUsage.MAP_READ | GPUBufferUsage.COPY_DST,
  });

  return { querySet, resolveBuffer, readBuffer, capacity, labels: [], mapping: false };
}

export function resolveTimestamps(
  encoder: GPUCommandEncoder,
  ts: TimestampHelper
) {
  encoder.resolveQuerySet(ts.querySet, 0, ts.labels.length, ts.resolveBuffer, 0);
  encoder.copyBufferToBuffer(
    ts.resolveBuffer,
    0,
    ts.readBuffer,
    0,
    ts.labels.length * 8
  );
}

export async function readTimestamps(
  ts: TimestampHelper
): Promise<Map<string, number>> {
  const results = new Map<string, number>();
  if (ts.labels.length < 2 || ts.mapping) return results;

  ts.mapping = true;
  const labelsCopy = ts.labels.slice();
  ts.labels = [];

  try {
    await ts.readBuffer.mapAsync(GPUMapMode.READ);
    const data = new BigInt64Array(ts.readBuffer.getMappedRange());

    for (let i = 0; i < labelsCopy.length - 1; i += 2) {
      const start = data[i];
      const end = data[i + 1];
      const ms = Number(end - start) / 1_000_000;
      const label = labelsCopy[i] || `pass${i / 2}`;
      results.set(label, ms);
    }

    ts.readBuffer.unmap();
  } finally {
    ts.mapping = false;
  }
  return results;
}
