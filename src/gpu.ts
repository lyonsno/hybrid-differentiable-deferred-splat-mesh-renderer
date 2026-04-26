export interface GPU {
  device: GPUDevice;
  context: GPUCanvasContext;
  format: GPUTextureFormat;
  canvas: HTMLCanvasElement;
  timestampsSupported: boolean;
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

  const requiredFeatures: GPUFeatureName[] = [];
  if (timestampsSupported) {
    requiredFeatures.push("timestamp-query");
  }

  const device = await adapter.requestDevice({
    requiredFeatures,
    requiredLimits: {
      maxStorageBufferBindingSize: adapter.limits.maxStorageBufferBindingSize,
      maxBufferSize: adapter.limits.maxBufferSize,
    },
  });

  device.lost.then((info) => {
    console.error("WebGPU device lost:", info.message);
    if (info.reason !== "destroyed") {
      // Could attempt re-init here
    }
  });

  const context = canvas.getContext("webgpu");
  if (!context) {
    throw new Error("Failed to get WebGPU context");
  }

  const format = navigator.gpu.getPreferredCanvasFormat();
  context.configure({ device, format, alphaMode: "opaque" });

  return { device, context, format, canvas, timestampsSupported };
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
