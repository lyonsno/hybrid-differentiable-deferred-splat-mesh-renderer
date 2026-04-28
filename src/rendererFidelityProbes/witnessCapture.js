export const WITNESS_CONTRACT_INPUTS = {
  fieldAutopsy: "66b4ea26e5d81ac614f4452b8d21308c4e432e1a",
  slabSentinel: "ca96409",
  conicReckoner: "f9e3498c00d44f2bb70eba1013f11c2f39b1aff1",
  alphaLedger: "0474666",
};

export const WITNESS_FIELD_CANONICAL = {
  scaleSpace: "log",
  rotationOrder: "wxyz",
  opacitySpace: "unit",
  colorSpace: "sh_dc_rgb",
};

export function createWitnessCapture({
  field = {},
  projection = undefined,
  slab = undefined,
  alpha = undefined,
  notes = [],
} = {}) {
  return {
    contractInputs: { ...WITNESS_CONTRACT_INPUTS },
    field: { ...field },
    ...(projection ? { projection: { ...projection } } : {}),
    ...(slab ? { slab: { ...slab } } : {}),
    ...(alpha ? { alpha: { ...alpha } } : {}),
    notes: [...notes],
  };
}

export function exposeWitnessCapture(capture, target = globalThis) {
  target.__MESH_SPLAT_WITNESS__ = capture;
  return capture;
}
