export const SH_C0 = 0.28209479177387814;

export const FIELD_SEMANTICS_CONTRACT = {
  colorSpace: "sh_dc_rgb",
  colorActivation: "clamp01(0.5 + SH_C0 * f_dc)",
  opacitySpace: "logit",
  opacityActivation: "sigmoid(opacity)",
  scaleSpace: "log",
  radiusSeed: "max(exp(scale_0), exp(scale_1), exp(scale_2))",
  rotationOrder: "wxyz",
  coordinateHandedness: "preserve_source_xyz",
} as const;

export interface RawPlySemanticFields {
  dc: readonly [number, number, number];
  opacity: number;
  scales: readonly [number, number, number];
  rotation: readonly [number, number, number, number];
}

export interface DecodedPlySemanticFields {
  color: [number, number, number];
  opacity: number;
  radius: number;
  scales: [number, number, number];
  rotation: [number, number, number, number];
}

type UnknownRecord = Record<string, unknown>;

export function decodePlySemanticFields(
  fields: RawPlySemanticFields
): DecodedPlySemanticFields {
  return {
    color: [
      shDcToRgb(fields.dc[0]),
      shDcToRgb(fields.dc[1]),
      shDcToRgb(fields.dc[2]),
    ],
    opacity: sigmoid(fields.opacity),
    radius: radiusSeedFromLogScales(fields.scales),
    scales: [fields.scales[0], fields.scales[1], fields.scales[2]],
    rotation: [
      fields.rotation[0],
      fields.rotation[1],
      fields.rotation[2],
      fields.rotation[3],
    ],
  };
}

export function shDcToRgb(dc: number): number {
  return clamp01(0.5 + SH_C0 * requireFinite(dc, "f_dc"));
}

export function sigmoid(logit: number): number {
  const value = requireFinite(logit, "opacity");
  return 1 / (1 + Math.exp(-value));
}

export function radiusSeedFromLogScales(
  scales: readonly [number, number, number]
): number {
  return Math.max(
    Math.exp(requireFinite(scales[0], "scale_0")),
    Math.exp(requireFinite(scales[1], "scale_1")),
    Math.exp(requireFinite(scales[2], "scale_2"))
  );
}

export function requireFieldSemanticsManifest(manifest: unknown): void {
  const root = requireRecord(manifest, "manifest");
  const shape = requireRecord(root.shape, "shape");
  if (shape.scale_space !== FIELD_SEMANTICS_CONTRACT.scaleSpace) {
    throw new Error("shape.scale_space must be log for first-smoke field parity");
  }
  if (shape.rotation_order !== FIELD_SEMANTICS_CONTRACT.rotationOrder) {
    throw new Error("shape.rotation_order must be wxyz for first-smoke field parity");
  }

  const decode = requireRecord(root.decode, "decode");
  requireDecodeNote(decode.color, "decode.color", ["SH DC", "0.5", "0.28209479"]);
  requireDecodeNote(decode.opacity, "decode.opacity", ["sigmoid", "logit"]);
  requireDecodeNote(decode.radius, "decode.radius", ["exp", "scale"]);
}

function requireDecodeNote(value: unknown, path: string, needles: string[]): void {
  if (typeof value !== "string") {
    throw new Error(`${path} must be a string`);
  }
  for (const needle of needles) {
    if (!value.includes(needle)) {
      throw new Error(`${path} must mention ${needle}`);
    }
  }
}

function requireRecord(value: unknown, path: string): UnknownRecord {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error(`${path} must be an object`);
  }
  return value as UnknownRecord;
}

function requireFinite(value: number, field: string): number {
  if (!Number.isFinite(value)) {
    throw new Error(`${field} must be finite`);
  }
  return value;
}

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}
