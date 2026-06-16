# Visual Smoke Report

- Status: PASS
- Generated: 2026-06-16T00:10:47.100Z
- URL: http://127.0.0.1:5177/?renderer=compute&asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-close
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Smoke Handoff

- Smoke kind: visual
- Decision requested: Decide whether this smoke satisfies the branch-specific evidence contract.
- Expected visual delta: compute renderer runs multi-pass half-res DOF postprocess without blanking or shader validation failure
- Evidence surface: screenshot plus page smoke evidence


## Image Evidence

- Canvas PNG: 1280x720
- Nonblank: true
- Changed pixels: 182888 / 921600 (19.845%)
- Average background delta: 14.91
- Distinct colors: 45027

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
    "changedPixelRatio": 0.19844618055555555
  },
  "findings": [
    {
      "kind": "projection-anisotropy",
      "owner": "conic-reckoner",
      "severity": "suspect",
      "summary": "Projection anisotropy witness found ratio 81.03 across 1182 splats; route to conic-reckoner after field metadata is canonical.",
      "evidence": {
        "maxAnisotropyRatio": 81.03444813242491,
        "suspiciousSplatCount": 1182,
        "sampleOriginalIds": [
          92,
          93,
          102,
          103,
          104,
          238,
          255,
          256
        ],
        "footprint": {
          "maxMajorRadiusPx": 35.778378394861434,
          "maxMinorRadiusPx": 16.346807227955875,
          "maxAreaPx": 1502.0091901153173,
          "areaCapPx": 9216,
          "majorRadiusCapPx": 468,
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
      "summary": "Alpha density witness found 67 hot tiles with max mass 19032.73.",
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
          "maxTileAlphaMass": 19032.729813433685,
          "maxTileSplatCount": 2584,
          "hotTileCount": 67,
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
  "rendererLabel": "compute",
  "fps": 5,
  "tileLocalStatus": "not-applicable",
  "tileLocalDisabledReason": null,
  "postProcess": {
    "enabled": true,
    "fxaaEnabled": true,
    "casEnabled": true,
    "sampleRadius": 2,
    "sampleCount": 8,
    "casSharpness": 0.5249999999999999,
    "debugView": "final",
    "dofEnabled": false,
    "dofFocusDepth": 0.975,
    "dofStrength": 1.4,
    "dofRadius": 4
  },
  "temporalResolve": {
    "mode": "idle",
    "maxHistoryFrames": 8,
    "debugView": "final",
    "historyFrameCount": 8,
    "pendingTemporalResolve": false,
    "jitterOffsetPx": [
      0.375,
      0.125
    ],
    "resetReason": "initialized"
  },
  "postProcessAux": {
    "depthConfidence": "rgba16float",
    "channels": {
      "r": "alpha-weighted-depth-ndc",
      "g": "coverage-confidence",
      "b": "normalized-tile-support",
      "a": "valid"
    }
  },
  "arenaRuntime": {
    "requestedArenaBackend": "cpu",
    "effectiveArenaBackend": "cpu"
  },
  "operatorWitness": {
    "witnessView": "dessert-close",
    "revision": 0,
    "frameSerial": 8,
    "frameTimings": {
      "totalMs": 0.4,
      "stages": [
        {
          "name": "frame-uniforms",
          "elapsedMs": 0
        },
        {
          "name": "uniform-upload",
          "elapsedMs": 0
        },
        {
          "name": "queue-submit",
          "elapsedMs": 0
        },
        {
          "name": "evidence-exposure",
          "elapsedMs": 0.1
        }
      ]
    }
  },
  "tileLocal": {
    "refs": 0,
    "budget": {}
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
      "maxAnisotropyRatio": 81.03444813242491,
      "suspiciousSplatCount": 1182,
      "sampleOriginalIds": [
        92,
        93,
        102,
        103,
        104,
        238,
        255,
        256
      ],
      "fieldMaxAnisotropyRatio": 190.56626845863002,
      "fieldSuspiciousSplatCount": 8398,
      "rotationOrderComparison": {
        "wxyz": {
          "rotationOrder": "wxyz",
          "maxProjectedAnisotropyRatio": 81.03444813242491,
          "suspiciousProjectedSplatCount": 1182,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            92,
            93,
            102,
            103,
            104,
            238,
            255,
            256
          ]
        },
        "xyzw": {
          "rotationOrder": "xyzw",
          "maxProjectedAnisotropyRatio": 82.13449897409144,
          "suspiciousProjectedSplatCount": 1711,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            88,
            92,
            93,
            131,
            256,
            286,
            549,
            632
          ]
        }
      },
      "footprint": {
        "maxMajorRadiusPx": 35.778378394861434,
        "maxMinorRadiusPx": 16.346807227955875,
        "maxAreaPx": 1502.0091901153173,
        "areaCapPx": 9216,
        "majorRadiusCapPx": 468,
        "highEnergySplatCount": 0,
        "projectedSplatCount": 94406,
        "sampleOriginalIds": []
      },
      "cropSupport": {
        "rimBand": {
          "crop": {
            "x": 390,
            "y": 322,
            "width": 500,
            "height": 115
          },
          "projectedCenterCount": 32823,
          "projectedSupportCount": 33850,
          "nearFloorMinorCount": 29070,
          "maxMajorRadiusPx": 27.807714830393024,
          "medianMajorRadiusPx": 1.5410224690687664,
          "medianMinorRadiusPx": 1.5,
          "supportAreaPxSum": 467109.8697559612,
          "sampleOriginalIds": [
            152,
            158,
            159,
            160,
            161,
            162,
            164,
            172,
            176,
            177,
            178,
            179
          ]
        },
        "porousBody": {
          "crop": {
            "x": 520,
            "y": 270,
            "width": 260,
            "height": 150
          },
          "projectedCenterCount": 27705,
          "projectedSupportCount": 28304,
          "nearFloorMinorCount": 25038,
          "maxMajorRadiusPx": 27.807714830393024,
          "medianMajorRadiusPx": 1.5,
          "medianMinorRadiusPx": 1.5,
          "supportAreaPxSum": 366326.20708037715,
          "sampleOriginalIds": [
            188,
            193,
            205,
            214,
            219,
            223,
            224,
            225,
            226,
            227,
            228,
            229
          ]
        }
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
        "maxTileAlphaMass": 19032.729813433685,
        "maxTileSplatCount": 2584,
        "hotTileCount": 67,
        "tileEntryCount": 135143,
        "maxSplatCoveredTileCount": 15,
        "maxCenterTileDroppedCoverageFraction": 1,
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
  "statsText": "1280×720 | 5 fps | 94,406 real Scaniverse splats | renderer: compute | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 92,998 splats/67 tiles | arena requested: cpu | arena effective: cpu | post-fx: fxaa+cas/8s/r2/sharp 35% | temporal: idle/8/8 | app frame: 0.3ms | slowest app stage: frame-uniforms 0ms | render: 4.04ms",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "1280×720 | 5 fps | 94,406 real Scaniverse splats | renderer: compute | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 92,998 splats/67 tiles | arena requested: cpu | arena effective: cpu | post-fx: fxaa+cas/8s/r2/sharp 35% | temporal: idle/8/8 | app frame: 0.3ms | slowest app stage: frame-uniforms 0ms | render: 4.04ms\nPost FX",
  "canvas": {
    "width": 1280,
    "height": 720,
    "clientWidth": 1280,
    "clientHeight": 720
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
