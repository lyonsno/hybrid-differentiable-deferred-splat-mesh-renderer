export const SH_VIEWLIGHT_CONTRACT = Object.freeze({
  colorSpace: "sh_dc_plus_higher_order_rgb",
  basis: "3dgs_real_sh",
  coefficientsLayout: "splat_coeff_rgb",
  dcSource: "payload.color contains displayable RGB decoded from SH DC",
  coordinateConvention: Object.freeze({
    sourceCoordinates: "preserve_source_xyz",
    sourceQuaternionOrder: "wxyz",
    firstSmokePresentationFlip: "post_projection_y_only",
    sourceXScreenDirection: "positive_source_x_screen_right",
  }),
  productionShaderStatus: "steward_integrated",
});

const SH_C1 = 0.4886025119029199;

export function evaluateShColor({
  dcColor,
  shDegree,
  shCoefficients,
  viewDirection,
  clamp = true,
}) {
  const dc = requireVec3(dcColor, "dcColor");
  const degree = requireNonNegativeInteger(shDegree, "shDegree");
  const direction = normalizeVec3(viewDirection, "viewDirection");
  const coefficients = requireFloat32Like(shCoefficients, "shCoefficients");
  const coefficientCount = (degree + 1) ** 2 - 1;
  if (coefficients.length !== coefficientCount * 3) {
    throw new Error(
      `shCoefficients must contain ${coefficientCount * 3} float entries for degree ${degree}`
    );
  }

  const color = [dc[0], dc[1], dc[2]];
  if (degree >= 1) {
    const [x, y, z] = direction;
    addScaledRgb(color, coefficients, 0, -SH_C1 * y);
    addScaledRgb(color, coefficients, 1, SH_C1 * z);
    addScaledRgb(color, coefficients, 2, -SH_C1 * x);
  }
  if (degree > 1) {
    throw new Error("CPU SH viewlight witness currently supports degree 0 or 1");
  }

  return clamp ? [clamp01(color[0]), clamp01(color[1]), clamp01(color[2])] : color;
}

function addScaledRgb(color, coefficients, coefficientIndex, scale) {
  const base = coefficientIndex * 3;
  color[0] += scale * coefficients[base];
  color[1] += scale * coefficients[base + 1];
  color[2] += scale * coefficients[base + 2];
}

function normalizeVec3(value, path) {
  const vec = requireVec3(value, path);
  const length = Math.hypot(vec[0], vec[1], vec[2]);
  if (length === 0) {
    throw new Error(`${path} must not be the zero vector`);
  }
  return [vec[0] / length, vec[1] / length, vec[2] / length];
}

function requireVec3(value, path) {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
    throw new Error(`${path} must be a float3`);
  }
  if (value.length !== 3) {
    throw new Error(`${path} must be a float3`);
  }
  return [
    requireFinite(value[0], `${path}[0]`),
    requireFinite(value[1], `${path}[1]`),
    requireFinite(value[2], `${path}[2]`),
  ];
}

function requireFloat32Like(value, path) {
  if (!Array.isArray(value) && !ArrayBuffer.isView(value)) {
    throw new Error(`${path} must be an array or typed array`);
  }
  return Array.from(value, (entry, index) => requireFinite(entry, `${path}[${index}]`));
}

function requireFinite(value, path) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new Error(`${path} must be finite`);
  }
  return value;
}

function requireNonNegativeInteger(value, path) {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${path} must be a non-negative integer`);
  }
  return value;
}

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}
