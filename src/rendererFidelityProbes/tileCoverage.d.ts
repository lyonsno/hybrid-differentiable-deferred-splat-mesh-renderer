export function buildProjectedGaussianTileCoverage(input: {
  readonly viewportWidth: number;
  readonly viewportHeight: number;
  readonly tileSizePx?: number;
  readonly sigmaRadius?: number;
  readonly samplesPerAxis?: number;
  readonly splats: Array<{
    readonly splatIndex: number;
    readonly originalId: number;
    readonly centerPx: readonly [number, number];
    readonly covariancePx: {
      readonly xx: number;
      readonly xy?: number;
      readonly yy: number;
    };
  }>;
}): unknown;
