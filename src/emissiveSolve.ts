export interface EmissiveSolveParams {
  originalColors: Float32Array;
  albedoColors: Float32Array;
  hueGateLo?: number;
  hueGateHi?: number;
  minDeltaMag?: number;
}

export interface EmissiveSolveResult {
  applied: boolean;
  count: number;
  emissiveSplats: number;
  emissive: Float32Array;
}

export function solveHueGatedEmissive(params: EmissiveSolveParams): EmissiveSolveResult {
  const count = Math.floor(Math.min(params.originalColors.length, params.albedoColors.length) / 3);
  const lo = params.hueGateLo ?? 0.02;
  const hi = params.hueGateHi ?? 0.15;
  const minMag = params.minDeltaMag ?? 0.02;
  const emissive = new Float32Array(count * 3);
  let emissiveSplats = 0;

  for (let i = 0; i < count; i++) {
    const b = i * 3;
    const dr = Math.max(0, params.originalColors[b] - params.albedoColors[b]);
    const dg = Math.max(0, params.originalColors[b + 1] - params.albedoColors[b + 1]);
    const db = Math.max(0, params.originalColors[b + 2] - params.albedoColors[b + 2]);
    const deltaMag = Math.sqrt(dr * dr + dg * dg + db * db);
    if (deltaMag < minMag) continue;

    const ar = params.albedoColors[b];
    const ag = params.albedoColors[b + 1];
    const ab = params.albedoColors[b + 2];
    const albMag = Math.sqrt(ar * ar + ag * ag + ab * ab);
    if (albMag < 1e-8) {
      emissive[b] = dr;
      emissive[b + 1] = dg;
      emissive[b + 2] = db;
    } else {
      const cosSim = (dr * ar + dg * ag + db * ab) / (deltaMag * albMag);
      const hueDivergence = 1.0 - cosSim;
      const t = Math.max(0, Math.min(1, (hueDivergence - lo) / Math.max(hi - lo, 1e-8)));
      const weight = t * t * (3.0 - 2.0 * t);
      emissive[b] = dr * weight;
      emissive[b + 1] = dg * weight;
      emissive[b + 2] = db * weight;
    }

    const finalMag = Math.sqrt(
      emissive[b] * emissive[b] +
      emissive[b + 1] * emissive[b + 1] +
      emissive[b + 2] * emissive[b + 2],
    );
    if (finalMag > 0.05) emissiveSplats++;
  }

  return { applied: false, count, emissiveSplats, emissive };
}
