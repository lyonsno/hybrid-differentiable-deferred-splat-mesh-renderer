export interface GPU {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
  timestampsSupported: boolean;
  f16Supported: boolean;
}

export async function initGPU(canvas: HTMLCanvasElement): Promise<GPU> {
  if (!navigator.gpu) {
    throw new Error("WebGPU not supported in this browser");
  }

  const adapter = await navigator.gpu.requestAdapter({
    powerPreference: "high-performance",
  });
  if (!adapter) {
    throw new Error("No WebGPU adapter found");
  }

  const timestampsSupported = adapter.features.has("timestamp-query");
  const f16Supported = adapter.features.has("shader-f16");
  const requiredFeatures: GPUFeatureName[] = [];
  if (timestampsSupported) {
    requiredFeatures.push("timestamp-query");
  }
  if (f16Supported) {
    requiredFeatures.push("shader-f16");
  }

  const device = await adapter.requestDevice({
    requiredFeatures,
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxStorageBuffersPerShaderStage: adapter.limits.maxStorageBuffersPerShaderStage,
      maxBufferSize: adapter.limits.maxBufferSize,
      maxComputeWorkgroupSizeX: adapter.limits.maxComputeWorkgroupSizeX,
      maxComputeInvocationsPerWorkgroup: adapter.limits.maxComputeInvocationsPerWorkgroup,
      maxComputeWorkgroupStorageSize: adapter.limits.maxComputeWorkgroupStorageSize,
    },
  });

  device.lost.then((info) => {
    console.error("WebGPU device lost:", info.message);
    if (info.reason !== "destroyed") {
      // Could attempt re-init here
    }
  });

  // Log all WebGPU validation errors to console
  device.addEventListener("uncapturederror", (event: GPUUncapturedErrorEvent) => {
    console.error("WebGPU validation error:", event.error.message);
  });

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Failed to get WebGPU context");
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  return { device, context, format, canvas, timestampsSupported, f16Supported };
}

export function resizeCanvas(gpu: GPU): { width: number; height: number } {
  const dpr = window.devicePixelRatio || 1;
  const w = Math.floor(gpu.canvas.clientWidth * dpr);
  const h = Math.floor(gpu.canvas.clientHeight * dpr);
  if (gpu.canvas.width !== w || gpu.canvas.height !== h) {
    gpu.canvas.width = w;
    gpu.canvas.height = h;
  }
  return { width: w, height: h };
}
