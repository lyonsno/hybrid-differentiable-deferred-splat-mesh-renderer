export function createUniformBuffer(
  device: GPUDevice,
  size: number,
  label?: string
): GPUBuffer {
  return device.createBuffer({
    label,
    size: Math.max(size, 16), // WebGPU minimum
    usage: GPUBufferUsage.UNIFORM | GPUBufferUsage.COPY_DST,
  });
}

export function createStorageBuffer(
  device: GPUDevice,
  data: ArrayBuffer,
  label?: string
): GPUBuffer {
  const buf = device.createBuffer({
    label,
    size: data.byteLength,
    usage: GPUBufferUsage.STORAGE | GPUBufferUsage.COPY_DST,
    mappedAtCreation: true,
  });
  new Uint8Array(buf.getMappedRange()).set(new Uint8Array(data));
  buf.unmap();
  return buf;
}

export function createTexture2D(
  device: GPUDevice,
  width: number,
  height: number,
  format: GPUTextureFormat,
  usage: GPUTextureUsageFlags,
  label?: string
): GPUTexture {
  return device.createTexture({
    label,
    size: { width, height },
    format,
    usage,
  });
}

export function createTexture3D(
  device: GPUDevice,
  width: number,
  height: number,
  depth: number,
  format: GPUTextureFormat,
  usage: GPUTextureUsageFlags,
  label?: string
): GPUTexture {
  return device.createTexture({
    label,
    size: { width, height, depthOrArrayLayers: depth },
    dimension: "3d",
    format,
    usage,
  });
}
