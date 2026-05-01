# Visual Smoke Report

- Status: PASS
- Generated: 2026-05-01T11:25:03.212Z
- URL: http://127.0.0.1:61600/?renderer=tile-local-visible
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Image Evidence

- Canvas PNG: 3456x1916
- Nonblank: true
- Changed pixels: 521337 / 6621696 (7.873%)
- Average background delta: 6.49
- Distinct colors: 104410

## Splat Evidence

- Real Scaniverse evidence: true
- Source kind: scaniverse_ply
- Splat count: 94406
- Asset path: /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json
- Sort backend: gpu-bitonic-cpu-depth-keys
- Summary: PASS: nonblank scaniverse_ply capture with 94406 splats from /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json.

## Renderer Fidelity Witness

- Threshold policy: witness-only; does not alter visual smoke pass/fail thresholds
- Findings: 2

```json
{
  "consumedContracts": {
    "fieldAutopsy": "66b4ea26e5d81ac614f4452b8d21308c4e432e1a",
    "slabSentinel": "ca96409",
    "conicReckoner": "f9e3498c00d44f2bb70eba1013f11c2f39b1aff1",
    "alphaLedger": "0474666"
  },
  "thresholdPolicy": "witness-only; does not alter visual smoke pass/fail thresholds",
  "smokeClassification": {
    "nonblank": true,
    "realSplatEvidence": true,
    "closeable": true,
    "harnessPassed": true,
    "sourceKind": "scaniverse_ply",
    "splatCount": 94406,
    "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
    "summary": "PASS: nonblank scaniverse_ply capture with 94406 splats from /smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json.",
    "reasons": []
  },
  "imageSummary": {
    "nonblank": true,
    "changedPixelRatio": 0.07873164216539086
  },
  "findings": [
    {
      "kind": "projection-anisotropy",
      "owner": "conic-reckoner",
      "severity": "suspect",
      "summary": "Projection anisotropy witness found ratio 69.64 across 1196 splats; route to conic-reckoner after field metadata is canonical.",
      "evidence": {
        "maxAnisotropyRatio": 69.64314438452782,
        "suspiciousSplatCount": 1196,
        "sampleOriginalIds": [
          89,
          91,
          102,
          103,
          104,
          238,
          256,
          453
        ],
        "footprint": {
          "maxMajorRadiusPx": 136.48559781163644,
          "maxMinorRadiusPx": 63.02277477803849,
          "maxAreaPx": 23270.485523995598,
          "areaCapPx": 66216.96,
          "majorRadiusCapPx": 1245.4,
          "highEnergySplatCount": 0,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": []
        }
      }
    },
    {
      "kind": "compositing-ambiguous",
      "owner": "alpha-ledger",
      "severity": "suspect",
      "summary": "Alpha density witness found 140 hot tiles with max mass 358193.71.",
      "evidence": {
        "alphaEnergyPolicy": "bounded-footprint-energy-cap",
        "nearPlaneAlphaFade": {
          "startNdc": 0,
          "endNdc": 0.08
        },
        "compositing": "straight-source-over",
        "ambiguousOverlapCount": 0,
        "overlapDensity": {
          "tileSizePx": 48,
          "alphaMassCap": 1728,
          "maxTileAlphaMass": 358193.71050510183,
          "maxTileSplatCount": 6591,
          "hotTileCount": 140,
          "sampleOriginalIds": [
            0,
            1,
            2,
            3,
            4,
            5,
            6,
            7
          ]
        }
      }
    }
  ]
}
```

## Sibling Contract Notes

- Synthetic or fixture content may validate this harness, but it does not close first smoke.
- To close first smoke, the integrated page should expose `window.__MESH_SPLAT_SMOKE__` or canvas/body data attributes with `sourceKind` set to real Scaniverse PLY/SPZ content, a positive `splatCount`, and an `assetPath`.
- The screenshot must remain nonblank after fixed overlays such as `#stats` are hidden, so overlay text cannot satisfy the canvas check.

## Page Evidence

```json
{
  "ready": true,
  "sourceKind": "scaniverse_ply",
  "realScaniverse": true,
  "realSplatEvidence": true,
  "synthetic": false,
  "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
  "splatCount": 94406,
  "sortedIdCount": 94406,
  "sortBackend": "gpu-bitonic-cpu-depth-keys",
  "boundsRadius": 0.22154541313648224,
  "rendererLabel": "tile-local-visible-gaussian-compositor",
  "fps": 0,
  "tileLocalDisabledReason": null,
  "tileLocalLastSkipReason": null,
  "tileLocal": {
    "refs": 531136,
    "allocatedRefs": 531136,
    "tileColumns": 576,
    "tileRows": 320,
    "orderingBackend": "gpu-sorted-index-rank-inversion",
    "debugMode": "final-color",
    "diagnostics": {
      "version": 1,
      "debugMode": "final-color",
      "tileGrid": {
        "columns": 576,
        "rows": 320,
        "tileSizePx": 6
      },
      "tileRefs": {
        "total": 531136,
        "nonEmptyTiles": 26369,
        "maxPerTile": 32,
        "averagePerNonEmptyTile": 20.14244,
        "density": 0.143061
      },
      "coverageWeight": {
        "min": 0,
        "max": 3.706141,
        "mean": 0.045109
      },
      "alpha": {
        "maxSourceOpacity": 1,
        "meanSourceOpacity": 0.295601,
        "estimatedMaxAccumulatedAlpha": 1,
        "estimatedMinTransmittance": 0,
        "alphaParamRefs": 531136
      },
      "conicShape": {
        "maxMajorRadiusPx": 152.239213,
        "minMinorRadiusPx": 0.487672,
        "maxAnisotropyRatio": 111.331569
      }
    }
  },
  "tileLocalDiagnostics": {
    "version": 1,
    "debugMode": "final-color",
    "tileGrid": {
      "columns": 576,
      "rows": 320,
      "tileSizePx": 6
    },
    "tileRefs": {
      "total": 531136,
      "nonEmptyTiles": 26369,
      "maxPerTile": 32,
      "averagePerNonEmptyTile": 20.14244,
      "density": 0.143061
    },
    "coverageWeight": {
      "min": 0,
      "max": 3.706141,
      "mean": 0.045109
    },
    "alpha": {
      "maxSourceOpacity": 1,
      "meanSourceOpacity": 0.295601,
      "estimatedMaxAccumulatedAlpha": 1,
      "estimatedMinTransmittance": 0,
      "alphaParamRefs": 531136
    },
    "conicShape": {
      "maxMajorRadiusPx": 152.239213,
      "minMinorRadiusPx": 0.487672,
      "maxAnisotropyRatio": 111.331569
    }
  },
  "witness": {
    "field": {
      "scaleSpace": "log",
      "rotationOrder": "wxyz",
      "opacitySpace": "unit",
      "colorSpace": "sh_dc_rgb"
    },
    "projection": {
      "projectionMode": "jacobian-covariance",
      "maxAnisotropyRatio": 69.64314438452782,
      "suspiciousSplatCount": 1196,
      "sampleOriginalIds": [
        89,
        91,
        102,
        103,
        104,
        238,
        256,
        453
      ],
      "fieldMaxAnisotropyRatio": 190.56626845863002,
      "fieldSuspiciousSplatCount": 8398,
      "rotationOrderComparison": {
        "wxyz": {
          "rotationOrder": "wxyz",
          "maxProjectedAnisotropyRatio": 69.64314438452782,
          "suspiciousProjectedSplatCount": 1196,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            89,
            91,
            102,
            103,
            104,
            238,
            256,
            453
          ]
        },
        "xyzw": {
          "rotationOrder": "xyzw",
          "maxProjectedAnisotropyRatio": 63.662050636681634,
          "suspiciousProjectedSplatCount": 1754,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            87,
            93,
            131,
            250,
            549,
            632,
            692,
            863
          ]
        }
      },
      "footprint": {
        "maxMajorRadiusPx": 136.48559781163644,
        "maxMinorRadiusPx": 63.02277477803849,
        "maxAreaPx": 23270.485523995598,
        "areaCapPx": 66216.96,
        "majorRadiusCapPx": 1245.4,
        "highEnergySplatCount": 0,
        "projectedSplatCount": 94406,
        "sampleOriginalIds": []
      }
    },
    "slab": {
      "statusCounts": {
        "axis-crosses-near-plane": 0,
        "pathological-footprint": 0,
        "accepted": 94406
      },
      "maxMajorRadiusPx": 0,
      "footprintCapPx": 0.65,
      "sampleOriginalIds": []
    },
    "alpha": {
      "alphaEnergyPolicy": "bounded-footprint-energy-cap",
      "nearPlaneAlphaFade": {
        "startNdc": 0,
        "endNdc": 0.08
      },
      "compositing": "straight-source-over",
      "ambiguousOverlapCount": 0,
      "overlapDensity": {
        "accountingMode": "coverage-aware",
        "tileSizePx": 48,
        "alphaMassCap": 1728,
        "maxTileAlphaMass": 358193.71050510183,
        "maxTileSplatCount": 6591,
        "hotTileCount": 140,
        "tileEntryCount": 435211,
        "maxSplatCoveredTileCount": 153,
        "maxCenterTileDroppedCoverageFraction": 0.9999999999864397,
        "sampleOriginalIds": [
          0,
          1,
          2,
          3,
          4,
          5,
          6,
          7
        ]
      }
    },
    "sort": {
      "backend": "gpu-bitonic-cpu-depth-keys",
      "sortedIdCount": 94406
    },
    "source": {
      "assetPath": "/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json",
      "splatCount": 94406,
      "sortedSampleOriginalIds": []
    }
  },
  "statsText": "3456×1916 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/140 tiles | tile-local: 576x320 tiles/531136 refs | tile-order: gpu-sorted-index-rank-inversion",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "3456×1916 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/140 tiles | tile-local: 576x320 tiles/531136 refs | tile-order: gpu-sorted-index-rank-inversion",
  "canvas": {
    "width": 3456,
    "height": 1916,
    "clientWidth": 3456,
    "clientHeight": 1916
  }
}
```

## Console

```json
{
  "consoleMessages": [
    {
      "type": "debug",
      "text": "[vite] connecting..."
    },
    {
      "type": "debug",
      "text": "[vite] connected."
    }
  ],
  "pageErrors": []
}
```
