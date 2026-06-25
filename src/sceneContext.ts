/**
 * Renderer-neutral scene/PBR context contract for the hybrid splat overlay.
 * Exported from the renderer repo as the source of truth for the type.
 * Hosts (Kaminos, Perceptasia, batch tools) import this type to construct
 * context packets; the overlay consumes them via setSceneContext.
 */

export type HybridRenderSceneContextV0 = {
  schema: "hybrid-render.scene-context.v0";

  producer: {
    app: "kaminos" | "perceptasia" | "gpu-greenroom" | string;
    sceneId?: string;
    frameId?: string;
  };

  frame: {
    worldUnits: "meters" | "unitless";
    upAxis: "Y";
    handedness: "right";
    colorSpace: "linear-srgb";
  };

  camera: {
    viewMatrix: number[];
    projectionMatrix: number[];
    positionWorld: [number, number, number];
    viewport: {
      width: number;
      height: number;
      devicePixelRatio: number;
    };
  };

  lighting?: {
    environment?: {
      kind: "hdr-url" | "preset" | "none";
      url?: string;
      preset?: string;
      intensity: number;
      rotationY?: number;
    };
    exposure?: number;
    toneMapping?: "none" | "reinhard" | "aces" | "agx" | string;
    ambientIntensity?: number;
    lights?: Array<{
      kind: "directional" | "point" | "spot";
      color: [number, number, number];
      intensity: number;
      position?: [number, number, number];
      direction?: [number, number, number];
    }>;
  };

  composition?: {
    mode: "overlay" | "depth-aware-overlay" | "unified";
    background: "transparent" | "scene" | "environment";
    depthSource?: "none" | "host-depth-texture" | "proxy-geometry";
  };

  objects?: Array<{
    id: string;
    kind: "splat" | "mesh";
    source: string;
    modelMatrix: number[];
    correction?: unknown;
  }>;
};

/** Telemetry for which scene-context fields the renderer actually honored. */
export interface SceneContextTelemetry {
  schema: string;
  accepted: boolean;
  timestamp?: string;
  frameId?: string;
  honored: {
    environment: boolean;
    environmentIntensity: boolean;
    environmentRotation: boolean;
    exposure: boolean;
    toneMapping: boolean;
    lights: boolean;
    depthSource: boolean;
  };
  unsupported: string[];
}

/** P0 env map presets that the renderer can resolve without a URL. */
export const ENV_PRESETS: Record<string, string> = {
  studio_small_09: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/studio_small_09_1k.hdr",
  kloofendal_48d: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/kloofendal_48d_partly_cloudy_puresky_1k.hdr",
  empty_warehouse_01: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/empty_warehouse_01_1k.hdr",
  royal_esplanade: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/royal_esplanade_1k.hdr",
  moonlit_golf: "https://dl.polyhaven.org/file/ph-assets/HDRIs/hdr/1k/moonlit_golf_1k.hdr",
};

/**
 * Classify which fields of a scene-context packet the renderer can honor.
 * Pure function — no GPU side effects. Used for telemetry reporting.
 */
export function classifySceneContextHonored(
  context: HybridRenderSceneContextV0 | { schema: string },
): SceneContextTelemetry {
  if (context.schema !== "hybrid-render.scene-context.v0") {
    return {
      schema: context.schema,
      accepted: false,
      honored: {
        environment: false,
        environmentIntensity: false,
        environmentRotation: false,
        exposure: false,
        toneMapping: false,
        lights: false,
        depthSource: false,
      },
      unsupported: ["unknown schema"],
    };
  }

  const ctx = context as HybridRenderSceneContextV0;
  const env = ctx.lighting?.environment;
  const hasEnv = !!env && env.kind !== "none";
  const canResolveEnv = hasEnv && (
    (env!.kind === "hdr-url" && !!env!.url) ||
    (env!.kind === "preset" && !!env!.preset && env!.preset in ENV_PRESETS)
  );

  const unsupported: string[] = [];
  if (ctx.lighting?.toneMapping && ctx.lighting.toneMapping !== "none" && ctx.lighting.toneMapping !== "reinhard") {
    unsupported.push(`toneMapping:${ctx.lighting.toneMapping}`);
  }
  if (ctx.lighting?.lights?.length) unsupported.push("lights");
  if (ctx.composition?.depthSource && ctx.composition.depthSource !== "none") {
    unsupported.push(`depthSource:${ctx.composition.depthSource}`);
  }

  return {
    schema: ctx.schema,
    accepted: true,
    timestamp: new Date().toISOString(),
    frameId: ctx.producer.frameId,
    honored: {
      environment: canResolveEnv,
      environmentIntensity: hasEnv,
      environmentRotation: hasEnv,
      exposure: false, // stored but not yet wired to tone mapping shader
      toneMapping: false, // P0: always Reinhard, don't claim we switch
      lights: false,
      depthSource: false,
    },
    unsupported,
  };
}
