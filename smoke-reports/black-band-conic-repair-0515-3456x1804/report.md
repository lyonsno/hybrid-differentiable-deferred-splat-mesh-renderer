# Visual Smoke Report

- Status: PASS
- Generated: 2026-05-15T03:14:46.104Z
- URL: http://127.0.0.1:61735/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible
- Screenshot: `canvas.png`
- Analysis JSON: `analysis.json`

## Image Evidence

- Canvas PNG: 3456x1804
- Nonblank: true
- Changed pixels: 464886 / 6234624 (7.457%)
- Average background delta: 7.01
- Distinct colors: 72821

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
    "changedPixelRatio": 0.07456520232815965
  },
  "findings": [
    {
      "kind": "projection-anisotropy",
      "owner": "conic-reckoner",
      "severity": "suspect",
      "summary": "Projection anisotropy witness found ratio 66.95 across 1296 splats; route to conic-reckoner after field metadata is canonical.",
      "evidence": {
        "maxAnisotropyRatio": 66.95086118888399,
        "suspiciousSplatCount": 1296,
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
          "maxMajorRadiusPx": 127.80461197878985,
          "maxMinorRadiusPx": 56.65088931020897,
          "maxAreaPx": 19423.54597138146,
          "areaCapPx": 62346.24,
          "majorRadiusCapPx": 1172.6000000000001,
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
      "summary": "Alpha density witness found 125 hot tiles with max mass 359575.80.",
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
          "maxTileAlphaMass": 359575.7989110461,
          "maxTileSplatCount": 8614,
          "hotTileCount": 125,
          "sampleOriginalIds": [
            0,
            1,
            2,
            5,
            6,
            16,
            17,
            19
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
  "tileLocalStatus": "current",
  "tileLocalDisabledReason": null,
  "arenaRuntime": {
    "requestedArenaBackend": "gpu",
    "effectiveArenaBackend": "gpu",
    "cpuBuildDurationMs": 26167.7,
    "gpuDispatchDurationMs": 0
  },
  "tileLocal": {
    "status": "current",
    "refs": 350464,
    "allocatedRefs": 350464,
    "tileColumns": 216,
    "tileRows": 113,
    "perPixelProjectedContributors": [
      {
        "status": "present",
        "anchorPixel": {
          "id": "lacunar-hole-dessert-1260-930",
          "kind": "lacunar-hole",
          "x": 1260,
          "y": 930,
          "description": "Dessert close-view hole where same-pixel projection, retention, order, and accumulation are missing.",
          "canonicalTileAddress": null
        },
        "tileAddress": {
          "tileSizePx": 16,
          "tileX": 78,
          "tileY": 58,
          "tileIndex": 12606,
          "localX": 12,
          "localY": 2
        },
        "traceRecord": {
          "schemaVersion": 1,
          "anchorPixel": {
            "id": "lacunar-hole-dessert-1260-930",
            "kind": "lacunar-hole",
            "x": 1260,
            "y": 930,
            "description": "Dessert close-view hole where same-pixel projection, retention, order, and accumulation are missing.",
            "canonicalTileAddress": null
          },
          "tileAddress": {
            "tileSizePx": 16,
            "tileX": 78,
            "tileY": 58,
            "tileIndex": 12606,
            "localX": 12,
            "localY": 2
          },
          "projectedContributors": [
            {
              "splatIndex": 31170,
              "originalId": 31170,
              "projectionStatus": "projected",
              "centerPx": [
                1425.2655387197015,
                1002.3003284061407
              ],
              "footprintPx": {
                "majorRadiusPx": 79.2437,
                "minorRadiusPx": 17.545227,
                "areaPx": 4367.909292
              },
              "coverageWeight": 6.712557222722661e-9,
              "inverseConic": [
                0.0002263642748485994,
                0.00045037531291577335,
                0.003181376073598985
              ],
              "viewDepth": -0.7156385183334351,
              "opacity": 0.3294117748737335,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187758
            },
            {
              "splatIndex": 57627,
              "originalId": 57627,
              "projectionStatus": "projected",
              "centerPx": [
                1395.5761692111078,
                1001.5420620587691
              ],
              "footprintPx": {
                "majorRadiusPx": 50.945297,
                "minorRadiusPx": 35.648074,
                "areaPx": 5705.451783
              },
              "coverageWeight": 0.00006539707493388762,
              "inverseConic": [
                0.0003892828042615123,
                0.000039827510567748775,
                0.0007829258669935376
              ],
              "viewDepth": -0.7022091746330261,
              "opacity": 0.4588235318660736,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187752
            },
            {
              "splatIndex": 77174,
              "originalId": 77174,
              "projectionStatus": "projected",
              "centerPx": [
                1407.255728860512,
                1007.9650279516037
              ],
              "footprintPx": {
                "majorRadiusPx": 76.279611,
                "minorRadiusPx": 16.054778,
                "areaPx": 3847.358463
              },
              "coverageWeight": 2.216438102056823e-15,
              "inverseConic": [
                0.0006776023187830473,
                0.0012725546279893458,
                0.003373900510995954
              ],
              "viewDepth": -0.6992390155792236,
              "opacity": 0.34117648005485535,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187761
            },
            {
              "splatIndex": 57631,
              "originalId": 57631,
              "projectionStatus": "projected",
              "centerPx": [
                1389.3917903526299,
                998.2095465631037
              ],
              "footprintPx": {
                "majorRadiusPx": 45.39981,
                "minorRadiusPx": 9.900486,
                "areaPx": 1412.083575
              },
              "coverageWeight": 1.2337191337030922e-29,
              "inverseConic": [
                0.0020210106547572724,
                0.003544682673914741,
                0.008666196768203181
              ],
              "viewDepth": -0.6938897371292114,
              "opacity": 0.30980396270751953,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187762
            },
            {
              "splatIndex": 3837,
              "originalId": 3837,
              "projectionStatus": "projected",
              "centerPx": [
                1382.3829455893017,
                1002.4336636105969
              ],
              "footprintPx": {
                "majorRadiusPx": 64.271322,
                "minorRadiusPx": 8.820872,
                "areaPx": 1781.060302
              },
              "coverageWeight": 8.442775721698126e-31,
              "inverseConic": [
                0.0013468788951966622,
                0.0035652498711307035,
                0.011747389509600085
              ],
              "viewDepth": -0.6908541917800903,
              "opacity": 0.7960784435272217,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187763
            },
            {
              "splatIndex": 37163,
              "originalId": 37163,
              "projectionStatus": "projected",
              "centerPx": [
                1376.0832502369328,
                1003.1507816525003
              ],
              "footprintPx": {
                "majorRadiusPx": 55.122769,
                "minorRadiusPx": 18.494654,
                "areaPx": 3202.779948
              },
              "coverageWeight": 3.605182266163045e-9,
              "inverseConic": [
                0.0005694787359793485,
                0.000752227353997632,
                0.0026831591931495615
              ],
              "viewDepth": -0.6893255710601807,
              "opacity": 0.8235294222831726,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187759
            },
            {
              "splatIndex": 91789,
              "originalId": 91789,
              "projectionStatus": "projected",
              "centerPx": [
                1392.0644542053765,
                1039.4312355720476
              ],
              "footprintPx": {
                "majorRadiusPx": 72.992417,
                "minorRadiusPx": 34.998168,
                "areaPx": 8025.515417
              },
              "coverageWeight": 0.000008591790782322694,
              "inverseConic": [
                0.00020296523902177583,
                0.0000967969512482363,
                0.000801138195198868
              ],
              "viewDepth": -0.6801083087921143,
              "opacity": 0.6509804129600525,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187756
            },
            {
              "splatIndex": 91788,
              "originalId": 91788,
              "projectionStatus": "projected",
              "centerPx": [
                1375.7211198513799,
                1044.5296392895611
              ],
              "footprintPx": {
                "majorRadiusPx": 48.178663,
                "minorRadiusPx": 46.20353,
                "areaPx": 6993.261618
              },
              "coverageWeight": 0.00006527737603166164,
              "inverseConic": [
                0.0004422065380150309,
                -0.000017285687247407144,
                0.00045704353385255306
              ],
              "viewDepth": -0.6799551248550415,
              "opacity": 0.34117648005485535,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187753
            },
            {
              "splatIndex": 78523,
              "originalId": 78523,
              "projectionStatus": "projected",
              "centerPx": [
                1403.7529600661137,
                1045.8314351869078
              ],
              "footprintPx": {
                "majorRadiusPx": 102.01318,
                "minorRadiusPx": 39.59788,
                "areaPx": 12690.481225
              },
              "coverageWeight": 0.0010812381641347143,
              "inverseConic": [
                0.00042781133615219625,
                -0.00026390048233446926,
                0.0003060390268536775
              ],
              "viewDepth": -0.675216555595398,
              "opacity": 0.4274510145187378,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187747
            },
            {
              "splatIndex": 92947,
              "originalId": 92947,
              "projectionStatus": "projected",
              "centerPx": [
                1560.8199915280775,
                1002.1288633076945
              ],
              "footprintPx": {
                "majorRadiusPx": 131.462522,
                "minorRadiusPx": 90.097738,
                "areaPx": 37210.518225
              },
              "coverageWeight": 0.00003436263536044944,
              "inverseConic": [
                0.00010774236940076189,
                -0.000027757565350785574,
                0.00007330906693199158
              ],
              "viewDepth": -0.670764684677124,
              "opacity": 0.5215686559677124,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187754
            },
            {
              "splatIndex": 3753,
              "originalId": 3753,
              "projectionStatus": "projected",
              "centerPx": [
                1339.7277086582135,
                1042.7850349709968
              ],
              "footprintPx": {
                "majorRadiusPx": 51.816795,
                "minorRadiusPx": 48.4233,
                "areaPx": 7882.696509
              },
              "coverageWeight": 0.0004423635691735829,
              "inverseConic": [
                0.0003763687920595599,
                -0.000014026279622282711,
                0.0004225461187140017
              ],
              "viewDepth": -0.6473754644393921,
              "opacity": 0.1725490391254425,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187749
            },
            {
              "splatIndex": 34377,
              "originalId": 34377,
              "projectionStatus": "projected",
              "centerPx": [
                1363.9440874961092,
                1038.1366680430042
              ],
              "footprintPx": {
                "majorRadiusPx": 77.488788,
                "minorRadiusPx": 60.180726,
                "areaPx": 14650.288075
              },
              "coverageWeight": 0.0011831070831399627,
              "inverseConic": [
                0.00018199375440397164,
                -0.000038135877101722395,
                0.0002606595825832702
              ],
              "viewDepth": -0.6401479244232178,
              "opacity": 0.3529411852359772,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187746
            },
            {
              "splatIndex": 31570,
              "originalId": 31570,
              "projectionStatus": "projected",
              "centerPx": [
                1400.9994873269977,
                1034.2070467679628
              ],
              "footprintPx": {
                "majorRadiusPx": 51.735038,
                "minorRadiusPx": 41.990663,
                "areaPx": 6824.759838
              },
              "coverageWeight": 0.000025258014063109544,
              "inverseConic": [
                0.0003736917091809961,
                -0.0000037169958751212207,
                0.0005670741521262572
              ],
              "viewDepth": -0.6287059187889099,
              "opacity": 0.25882354378700256,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187755
            },
            {
              "splatIndex": 40061,
              "originalId": 40061,
              "projectionStatus": "projected",
              "centerPx": [
                1370.998663543438,
                1019.4185965143614
              ],
              "footprintPx": {
                "majorRadiusPx": 46.777075,
                "minorRadiusPx": 28.575344,
                "areaPx": 4199.275805
              },
              "coverageWeight": 0.00016359221785422172,
              "inverseConic": [
                0.0005432806948861568,
                -0.00024244086484901024,
                0.0011384022269242434
              ],
              "viewDepth": -0.5822826623916626,
              "opacity": 0.24313725531101227,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187750
            },
            {
              "splatIndex": 35925,
              "originalId": 35925,
              "projectionStatus": "projected",
              "centerPx": [
                1475.2668462541412,
                990.3707046670245
              ],
              "footprintPx": {
                "majorRadiusPx": 78.405535,
                "minorRadiusPx": 17.582156,
                "areaPx": 4330.805944
              },
              "coverageWeight": 2.685661720872036e-12,
              "inverseConic": [
                0.0003832074704682586,
                0.0007930306589519384,
                0.0030143240730350217
              ],
              "viewDepth": -0.5810396075248718,
              "opacity": 0.8039215803146362,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187760
            },
            {
              "splatIndex": 62369,
              "originalId": 62369,
              "projectionStatus": "projected",
              "centerPx": [
                1341.7323344579327,
                1015.4867979338438
              ],
              "footprintPx": {
                "majorRadiusPx": 79.794649,
                "minorRadiusPx": 62.648649,
                "areaPx": 15704.906441
              },
              "coverageWeight": 0.0024024366474473106,
              "inverseConic": [
                0.00016337211784589356,
                -0.00002403025214865511,
                0.0002484697290613876
              ],
              "viewDepth": -0.5756883025169373,
              "opacity": 0.2039215862751007,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187745
            },
            {
              "splatIndex": 60158,
              "originalId": 60158,
              "projectionStatus": "projected",
              "centerPx": [
                1393.0623960065648,
                1015.2603184071763
              ],
              "footprintPx": {
                "majorRadiusPx": 78.984849,
                "minorRadiusPx": 69.077361,
                "areaPx": 17140.733311
              },
              "coverageWeight": 0.0010008086137529195,
              "inverseConic": [
                0.00017129496421789726,
                -0.000020521395550631914,
                0.00019856696535894394
              ],
              "viewDepth": -0.5409248471260071,
              "opacity": 0.301960825920105,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187748
            },
            {
              "splatIndex": 61313,
              "originalId": 61313,
              "projectionStatus": "projected",
              "centerPx": [
                1524.5969376275154,
                1002.4628622636711
              ],
              "footprintPx": {
                "majorRadiusPx": 143.340052,
                "minorRadiusPx": 51.795045,
                "areaPx": 23324.140327
              },
              "coverageWeight": 1.4695902553149392e-8,
              "inverseConic": [
                0.00027241347073870073,
                0.00014983571058518227,
                0.00014901200573703359
              ],
              "viewDepth": -0.530684232711792,
              "opacity": 0.1882352977991104,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187757
            },
            {
              "splatIndex": 43622,
              "originalId": 43622,
              "projectionStatus": "projected",
              "centerPx": [
                1593.8532222104955,
                1005.0106006360467
              ],
              "footprintPx": {
                "majorRadiusPx": 119.454829,
                "minorRadiusPx": 40.340062,
                "areaPx": 15138.754649
              },
              "coverageWeight": 0.0001168611867702955,
              "inverseConic": [
                0.0000809592042922423,
                -0.00007618862532763476,
                0.0006036275991475545
              ],
              "viewDepth": -0.5231723785400391,
              "opacity": 0.7843137383460999,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187751
            }
          ],
          "retainedContributors": [],
          "orderedContributors": [],
          "finalColorAccumulation": {
            "steps": [],
            "outputColor": [
              0,
              0,
              0,
              0
            ]
          },
          "dispatchCache": {
            "tileIndex": 12606,
            "clearFrameId": 0,
            "buildFrameId": 0,
            "compositeFrameId": 0
          },
          "rendererMetadata": {
            "requestedRenderer": "tile-local-visible",
            "effectiveRenderer": "tile-local-visible",
            "viewport": {
              "width": 3456,
              "height": 1804
            },
            "tileSizePx": 16,
            "maxRefsPerTile": 256
          },
          "deferredFields": {
            "preserved": true,
            "deferredSurface": null,
            "normalSum": null,
            "albedoSum": null,
            "matSum": null,
            "weightSum": null,
            "provisionalDepth": null,
            "confidence": null,
            "lossEvidence": null
          }
        }
      },
      {
        "status": "present",
        "anchorPixel": {
          "id": "dense-foreground-leak-1580-1260",
          "kind": "dense-foreground-leak",
          "x": 1580,
          "y": 1260,
          "description": "Dense foreground leak where alpha/conic/retention causes must be separated by contributor identity.",
          "canonicalTileAddress": null
        },
        "tileAddress": {
          "tileSizePx": 16,
          "tileX": 98,
          "tileY": 78,
          "tileIndex": 16946,
          "localX": 12,
          "localY": 12
        },
        "traceRecord": {
          "schemaVersion": 1,
          "anchorPixel": {
            "id": "dense-foreground-leak-1580-1260",
            "kind": "dense-foreground-leak",
            "x": 1580,
            "y": 1260,
            "description": "Dense foreground leak where alpha/conic/retention causes must be separated by contributor identity.",
            "canonicalTileAddress": null
          },
          "tileAddress": {
            "tileSizePx": 16,
            "tileX": 98,
            "tileY": 78,
            "tileIndex": 16946,
            "localX": 12,
            "localY": 12
          },
          "projectedContributors": [
            {
              "splatIndex": 54397,
              "originalId": 54397,
              "projectionStatus": "projected",
              "centerPx": [
                1565.3960466152525,
                1051.8651605165176
              ],
              "footprintPx": {
                "majorRadiusPx": 90.316683,
                "minorRadiusPx": 24.100838,
                "areaPx": 6838.329135
              },
              "coverageWeight": 0.0009330091383682842,
              "inverseConic": [
                0.0016776357647624745,
                -0.00026151019178279365,
                0.00016657046714274912
              ],
              "viewDepth": -0.7084073424339294,
              "opacity": 0.28235292434692383,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913170
            },
            {
              "splatIndex": 85417,
              "originalId": 85417,
              "projectionStatus": "projected",
              "centerPx": [
                1748.8062145467325,
                942.7386289167504
              ],
              "footprintPx": {
                "majorRadiusPx": 109.979777,
                "minorRadiusPx": 77.208596,
                "areaPx": 26676.470178
              },
              "coverageWeight": 0.00002405549917355338,
              "inverseConic": [
                0.00014576032187580052,
                0.00003724748978948944,
                0.00010466708152687385
              ],
              "viewDepth": -0.696622908115387,
              "opacity": 0.7411764860153198,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913177
            },
            {
              "splatIndex": 92896,
              "originalId": 92896,
              "projectionStatus": "projected",
              "centerPx": [
                1593.015892541419,
                1021.296194750957
              ],
              "footprintPx": {
                "majorRadiusPx": 80.543558,
                "minorRadiusPx": 28.120039,
                "areaPx": 7115.355475
              },
              "coverageWeight": 0.00007082108796661,
              "inverseConic": [
                0.0011816039168376963,
                0.00029209527901506434,
                0.0002371879042847051
              ],
              "viewDepth": -0.692294180393219,
              "opacity": 0.3764705955982208,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913173
            },
            {
              "splatIndex": 78523,
              "originalId": 78523,
              "projectionStatus": "projected",
              "centerPx": [
                1403.7529600661137,
                1045.8314351869078
              ],
              "footprintPx": {
                "majorRadiusPx": 102.01318,
                "minorRadiusPx": 39.59788,
                "areaPx": 12690.481225
              },
              "coverageWeight": 0.0002891649041555365,
              "inverseConic": [
                0.00042781133615219625,
                -0.00026390048233446926,
                0.0003060390268536775
              ],
              "viewDepth": -0.675216555595398,
              "opacity": 0.4274510145187378,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913172
            },
            {
              "splatIndex": 92947,
              "originalId": 92947,
              "projectionStatus": "projected",
              "centerPx": [
                1560.8199915280775,
                1002.1288633076945
              ],
              "footprintPx": {
                "majorRadiusPx": 131.462522,
                "minorRadiusPx": 90.097738,
                "areaPx": 37210.518225
              },
              "coverageWeight": 0.00035614806772968436,
              "inverseConic": [
                0.00010774236940076189,
                -0.000027757565350785574,
                0.00007330906693199158
              ],
              "viewDepth": -0.670764684677124,
              "opacity": 0.5215686559677124,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913171
            },
            {
              "splatIndex": 85423,
              "originalId": 85423,
              "projectionStatus": "projected",
              "centerPx": [
                1752.1406372491558,
                1005.9832518018704
              ],
              "footprintPx": {
                "majorRadiusPx": 85.962941,
                "minorRadiusPx": 65.707294,
                "areaPx": 17744.947702
              },
              "coverageWeight": 0.0000018807826635719695,
              "inverseConic": [
                0.0002306877523590877,
                -0.000009420074795644245,
                0.00013625534986589486
              ],
              "viewDepth": -0.6636021137237549,
              "opacity": 0.5058823823928833,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913180
            },
            {
              "splatIndex": 40428,
              "originalId": 40428,
              "projectionStatus": "projected",
              "centerPx": [
                1603.3031990922325,
                913.8019317942264
              ],
              "footprintPx": {
                "majorRadiusPx": 114.131095,
                "minorRadiusPx": 61.634615,
                "areaPx": 22099.301287
              },
              "coverageWeight": 0.00005361925570902175,
              "inverseConic": [
                0.0002558685351282072,
                0.00003633293339169815,
                0.00008414079258707531
              ],
              "viewDepth": -0.5842319130897522,
              "opacity": 0.9411764740943909,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913175
            },
            {
              "splatIndex": 43409,
              "originalId": 43409,
              "projectionStatus": "projected",
              "centerPx": [
                1639.9056774985722,
                926.0574646863303
              ],
              "footprintPx": {
                "majorRadiusPx": 119.513414,
                "minorRadiusPx": 75.63787,
                "areaPx": 28399.180733
              },
              "coverageWeight": 0.00005605058280991041,
              "inverseConic": [
                0.00017407617693862646,
                -0.000008630577574799333,
                0.00007072683901309152
              ],
              "viewDepth": -0.5715223550796509,
              "opacity": 0.8392156958580017,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913174
            },
            {
              "splatIndex": 45846,
              "originalId": 45846,
              "projectionStatus": "projected",
              "centerPx": [
                1697.7758720351767,
                993.8464921792228
              ],
              "footprintPx": {
                "majorRadiusPx": 107.058671,
                "minorRadiusPx": 88.656222,
                "areaPx": 29818.166739
              },
              "coverageWeight": 0.00002738005510155097,
              "inverseConic": [
                0.00008728182312528806,
                -0.0000011595067839580394,
                0.0001271940090374611
              ],
              "viewDepth": -0.5552724599838257,
              "opacity": 0.8784314393997192,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913176
            },
            {
              "splatIndex": 61313,
              "originalId": 61313,
              "projectionStatus": "projected",
              "centerPx": [
                1524.5969376275154,
                1002.4628622636711
              ],
              "footprintPx": {
                "majorRadiusPx": 143.340052,
                "minorRadiusPx": 51.795045,
                "areaPx": 23324.140327
              },
              "coverageWeight": 0.00000451916842091624,
              "inverseConic": [
                0.00027241347073870073,
                0.00014983571058518227,
                0.00014901200573703359
              ],
              "viewDepth": -0.530684232711792,
              "opacity": 0.1882352977991104,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913178
            },
            {
              "splatIndex": 4002,
              "originalId": 4002,
              "projectionStatus": "projected",
              "centerPx": [
                1836.1650151552965,
                1001.2876894934271
              ],
              "footprintPx": {
                "majorRadiusPx": 95.580938,
                "minorRadiusPx": 88.273818,
                "areaPx": 26506.541632
              },
              "coverageWeight": 0.0000032060307768881387,
              "inverseConic": [
                0.00011461851589570378,
                0.000008410483286284196,
                0.00012317434434610936
              ],
              "viewDepth": -0.5042622089385986,
              "opacity": 0.7647058963775635,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913179
            }
          ],
          "retainedContributors": [],
          "orderedContributors": [],
          "finalColorAccumulation": {
            "steps": [],
            "outputColor": [
              0,
              0,
              0,
              0
            ]
          },
          "dispatchCache": {
            "tileIndex": 16946,
            "clearFrameId": 0,
            "buildFrameId": 0,
            "compositeFrameId": 0
          },
          "rendererMetadata": {
            "requestedRenderer": "tile-local-visible",
            "effectiveRenderer": "tile-local-visible",
            "viewport": {
              "width": 3456,
              "height": 1804
            },
            "tileSizePx": 16,
            "maxRefsPerTile": 256
          },
          "deferredFields": {
            "preserved": true,
            "deferredSurface": null,
            "normalSum": null,
            "albedoSum": null,
            "matSum": null,
            "weightSum": null,
            "provisionalDepth": null,
            "confidence": null,
            "lossEvidence": null
          }
        }
      },
      {
        "status": "present",
        "anchorPixel": {
          "id": "black-band-dropout-2300-1055",
          "kind": "black-band-dropout",
          "x": 2300,
          "y": 1055,
          "description": "Horizontal band/dropout pixel with known tile address at tileSizePx=16.",
          "canonicalTileAddress": {
            "tileX": 143,
            "tileY": 65,
            "tileIndex": 14183,
            "localX": 12,
            "localY": 15
          }
        },
        "tileAddress": {
          "tileSizePx": 16,
          "tileX": 143,
          "tileY": 65,
          "tileIndex": 14183,
          "localX": 12,
          "localY": 15
        },
        "traceRecord": {
          "schemaVersion": 1,
          "anchorPixel": {
            "id": "black-band-dropout-2300-1055",
            "kind": "black-band-dropout",
            "x": 2300,
            "y": 1055,
            "description": "Horizontal band/dropout pixel with known tile address at tileSizePx=16.",
            "canonicalTileAddress": {
              "tileX": 143,
              "tileY": 65,
              "tileIndex": 14183,
              "localX": 12,
              "localY": 15
            }
          },
          "tileAddress": {
            "tileSizePx": 16,
            "tileX": 143,
            "tileY": 65,
            "tileIndex": 14183,
            "localX": 12,
            "localY": 15
          },
          "projectedContributors": [
            {
              "splatIndex": 87386,
              "originalId": 87386,
              "projectionStatus": "projected",
              "centerPx": [
                2116.802795836614,
                1020.0000211992419
              ],
              "footprintPx": {
                "majorRadiusPx": 71.351656,
                "minorRadiusPx": 61.877698,
                "areaPx": 13870.370989
              },
              "coverageWeight": 0.00021563291812395251,
              "inverseConic": [
                0.00021853002002069583,
                0.00003070445583185498,
                0.00023906783613453477
              ],
              "viewDepth": -0.5866499543190002,
              "opacity": 0.35686278343200684,
              "tileIndex": 14183,
              "tileX": 143,
              "tileY": 65,
              "projectedIndex": 2721343
            },
            {
              "splatIndex": 87369,
              "originalId": 87369,
              "projectionStatus": "projected",
              "centerPx": [
                2080.042287645351,
                1024.8105756731634
              ],
              "footprintPx": {
                "majorRadiusPx": 82.232968,
                "minorRadiusPx": 72.121645,
                "areaPx": 18632.085237
              },
              "coverageWeight": 0.00019441714687238104,
              "inverseConic": [
                0.00015402070055196016,
                -0.000015322501887454922,
                0.00018610989570900727
              ],
              "viewDepth": -0.5753166079521179,
              "opacity": 0.7372549176216125,
              "tileIndex": 14183,
              "tileX": 143,
              "tileY": 65,
              "projectedIndex": 2721344
            }
          ],
          "retainedContributors": [],
          "orderedContributors": [],
          "finalColorAccumulation": {
            "steps": [],
            "outputColor": [
              0,
              0,
              0,
              0
            ]
          },
          "dispatchCache": {
            "tileIndex": 14183,
            "clearFrameId": 0,
            "buildFrameId": 0,
            "compositeFrameId": 0
          },
          "rendererMetadata": {
            "requestedRenderer": "tile-local-visible",
            "effectiveRenderer": "tile-local-visible",
            "viewport": {
              "width": 3456,
              "height": 1804
            },
            "tileSizePx": 16,
            "maxRefsPerTile": 256
          },
          "deferredFields": {
            "preserved": true,
            "deferredSurface": null,
            "normalSum": null,
            "albedoSum": null,
            "matSum": null,
            "weightSum": null,
            "provisionalDepth": null,
            "confidence": null,
            "lossEvidence": null
          }
        }
      }
    ],
    "perPixelRetainedContributors": [
      {
        "status": "sufficient",
        "anchorPixel": {
          "id": "lacunar-hole-dessert-1260-930",
          "kind": "lacunar-hole",
          "x": 1260,
          "y": 930,
          "description": "Dessert close-view hole where same-pixel projection, retention, order, and accumulation are missing.",
          "canonicalTileAddress": null
        },
        "tileAddress": {
          "tileSizePx": 16,
          "tileX": 78,
          "tileY": 58,
          "tileIndex": 12606,
          "localX": 12,
          "localY": 2
        },
        "projectedContributors": [
          {
            "splatIndex": 31170,
            "originalId": 31170,
            "projectionStatus": "projected",
            "centerPx": [
              1425.2655387197015,
              1002.3003284061407
            ],
            "footprintPx": {
              "majorRadiusPx": 79.2437,
              "minorRadiusPx": 17.545227,
              "areaPx": 4367.909292
            },
            "coverageWeight": 6.712557222722661e-9,
            "inverseConic": [
              0.0002263642748485994,
              0.00045037531291577335,
              0.003181376073598985
            ],
            "viewDepth": -0.7156385183334351,
            "opacity": 0.3294117748737335,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187758
          },
          {
            "splatIndex": 57627,
            "originalId": 57627,
            "projectionStatus": "projected",
            "centerPx": [
              1395.5761692111078,
              1001.5420620587691
            ],
            "footprintPx": {
              "majorRadiusPx": 50.945297,
              "minorRadiusPx": 35.648074,
              "areaPx": 5705.451783
            },
            "coverageWeight": 0.00006539707493388762,
            "inverseConic": [
              0.0003892828042615123,
              0.000039827510567748775,
              0.0007829258669935376
            ],
            "viewDepth": -0.7022091746330261,
            "opacity": 0.4588235318660736,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187752
          },
          {
            "splatIndex": 77174,
            "originalId": 77174,
            "projectionStatus": "projected",
            "centerPx": [
              1407.255728860512,
              1007.9650279516037
            ],
            "footprintPx": {
              "majorRadiusPx": 76.279611,
              "minorRadiusPx": 16.054778,
              "areaPx": 3847.358463
            },
            "coverageWeight": 2.216438102056823e-15,
            "inverseConic": [
              0.0006776023187830473,
              0.0012725546279893458,
              0.003373900510995954
            ],
            "viewDepth": -0.6992390155792236,
            "opacity": 0.34117648005485535,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187761
          },
          {
            "splatIndex": 57631,
            "originalId": 57631,
            "projectionStatus": "projected",
            "centerPx": [
              1389.3917903526299,
              998.2095465631037
            ],
            "footprintPx": {
              "majorRadiusPx": 45.39981,
              "minorRadiusPx": 9.900486,
              "areaPx": 1412.083575
            },
            "coverageWeight": 1.2337191337030922e-29,
            "inverseConic": [
              0.0020210106547572724,
              0.003544682673914741,
              0.008666196768203181
            ],
            "viewDepth": -0.6938897371292114,
            "opacity": 0.30980396270751953,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187762
          },
          {
            "splatIndex": 3837,
            "originalId": 3837,
            "projectionStatus": "projected",
            "centerPx": [
              1382.3829455893017,
              1002.4336636105969
            ],
            "footprintPx": {
              "majorRadiusPx": 64.271322,
              "minorRadiusPx": 8.820872,
              "areaPx": 1781.060302
            },
            "coverageWeight": 8.442775721698126e-31,
            "inverseConic": [
              0.0013468788951966622,
              0.0035652498711307035,
              0.011747389509600085
            ],
            "viewDepth": -0.6908541917800903,
            "opacity": 0.7960784435272217,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187763
          },
          {
            "splatIndex": 37163,
            "originalId": 37163,
            "projectionStatus": "projected",
            "centerPx": [
              1376.0832502369328,
              1003.1507816525003
            ],
            "footprintPx": {
              "majorRadiusPx": 55.122769,
              "minorRadiusPx": 18.494654,
              "areaPx": 3202.779948
            },
            "coverageWeight": 3.605182266163045e-9,
            "inverseConic": [
              0.0005694787359793485,
              0.000752227353997632,
              0.0026831591931495615
            ],
            "viewDepth": -0.6893255710601807,
            "opacity": 0.8235294222831726,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187759
          },
          {
            "splatIndex": 91789,
            "originalId": 91789,
            "projectionStatus": "projected",
            "centerPx": [
              1392.0644542053765,
              1039.4312355720476
            ],
            "footprintPx": {
              "majorRadiusPx": 72.992417,
              "minorRadiusPx": 34.998168,
              "areaPx": 8025.515417
            },
            "coverageWeight": 0.000008591790782322694,
            "inverseConic": [
              0.00020296523902177583,
              0.0000967969512482363,
              0.000801138195198868
            ],
            "viewDepth": -0.6801083087921143,
            "opacity": 0.6509804129600525,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187756
          },
          {
            "splatIndex": 91788,
            "originalId": 91788,
            "projectionStatus": "projected",
            "centerPx": [
              1375.7211198513799,
              1044.5296392895611
            ],
            "footprintPx": {
              "majorRadiusPx": 48.178663,
              "minorRadiusPx": 46.20353,
              "areaPx": 6993.261618
            },
            "coverageWeight": 0.00006527737603166164,
            "inverseConic": [
              0.0004422065380150309,
              -0.000017285687247407144,
              0.00045704353385255306
            ],
            "viewDepth": -0.6799551248550415,
            "opacity": 0.34117648005485535,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187753
          },
          {
            "splatIndex": 78523,
            "originalId": 78523,
            "projectionStatus": "projected",
            "centerPx": [
              1403.7529600661137,
              1045.8314351869078
            ],
            "footprintPx": {
              "majorRadiusPx": 102.01318,
              "minorRadiusPx": 39.59788,
              "areaPx": 12690.481225
            },
            "coverageWeight": 0.0010812381641347143,
            "inverseConic": [
              0.00042781133615219625,
              -0.00026390048233446926,
              0.0003060390268536775
            ],
            "viewDepth": -0.675216555595398,
            "opacity": 0.4274510145187378,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187747
          },
          {
            "splatIndex": 92947,
            "originalId": 92947,
            "projectionStatus": "projected",
            "centerPx": [
              1560.8199915280775,
              1002.1288633076945
            ],
            "footprintPx": {
              "majorRadiusPx": 131.462522,
              "minorRadiusPx": 90.097738,
              "areaPx": 37210.518225
            },
            "coverageWeight": 0.00003436263536044944,
            "inverseConic": [
              0.00010774236940076189,
              -0.000027757565350785574,
              0.00007330906693199158
            ],
            "viewDepth": -0.670764684677124,
            "opacity": 0.5215686559677124,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187754
          },
          {
            "splatIndex": 3753,
            "originalId": 3753,
            "projectionStatus": "projected",
            "centerPx": [
              1339.7277086582135,
              1042.7850349709968
            ],
            "footprintPx": {
              "majorRadiusPx": 51.816795,
              "minorRadiusPx": 48.4233,
              "areaPx": 7882.696509
            },
            "coverageWeight": 0.0004423635691735829,
            "inverseConic": [
              0.0003763687920595599,
              -0.000014026279622282711,
              0.0004225461187140017
            ],
            "viewDepth": -0.6473754644393921,
            "opacity": 0.1725490391254425,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187749
          },
          {
            "splatIndex": 34377,
            "originalId": 34377,
            "projectionStatus": "projected",
            "centerPx": [
              1363.9440874961092,
              1038.1366680430042
            ],
            "footprintPx": {
              "majorRadiusPx": 77.488788,
              "minorRadiusPx": 60.180726,
              "areaPx": 14650.288075
            },
            "coverageWeight": 0.0011831070831399627,
            "inverseConic": [
              0.00018199375440397164,
              -0.000038135877101722395,
              0.0002606595825832702
            ],
            "viewDepth": -0.6401479244232178,
            "opacity": 0.3529411852359772,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187746
          },
          {
            "splatIndex": 31570,
            "originalId": 31570,
            "projectionStatus": "projected",
            "centerPx": [
              1400.9994873269977,
              1034.2070467679628
            ],
            "footprintPx": {
              "majorRadiusPx": 51.735038,
              "minorRadiusPx": 41.990663,
              "areaPx": 6824.759838
            },
            "coverageWeight": 0.000025258014063109544,
            "inverseConic": [
              0.0003736917091809961,
              -0.0000037169958751212207,
              0.0005670741521262572
            ],
            "viewDepth": -0.6287059187889099,
            "opacity": 0.25882354378700256,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187755
          },
          {
            "splatIndex": 40061,
            "originalId": 40061,
            "projectionStatus": "projected",
            "centerPx": [
              1370.998663543438,
              1019.4185965143614
            ],
            "footprintPx": {
              "majorRadiusPx": 46.777075,
              "minorRadiusPx": 28.575344,
              "areaPx": 4199.275805
            },
            "coverageWeight": 0.00016359221785422172,
            "inverseConic": [
              0.0005432806948861568,
              -0.00024244086484901024,
              0.0011384022269242434
            ],
            "viewDepth": -0.5822826623916626,
            "opacity": 0.24313725531101227,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187750
          },
          {
            "splatIndex": 35925,
            "originalId": 35925,
            "projectionStatus": "projected",
            "centerPx": [
              1475.2668462541412,
              990.3707046670245
            ],
            "footprintPx": {
              "majorRadiusPx": 78.405535,
              "minorRadiusPx": 17.582156,
              "areaPx": 4330.805944
            },
            "coverageWeight": 2.685661720872036e-12,
            "inverseConic": [
              0.0003832074704682586,
              0.0007930306589519384,
              0.0030143240730350217
            ],
            "viewDepth": -0.5810396075248718,
            "opacity": 0.8039215803146362,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187760
          },
          {
            "splatIndex": 62369,
            "originalId": 62369,
            "projectionStatus": "projected",
            "centerPx": [
              1341.7323344579327,
              1015.4867979338438
            ],
            "footprintPx": {
              "majorRadiusPx": 79.794649,
              "minorRadiusPx": 62.648649,
              "areaPx": 15704.906441
            },
            "coverageWeight": 0.0024024366474473106,
            "inverseConic": [
              0.00016337211784589356,
              -0.00002403025214865511,
              0.0002484697290613876
            ],
            "viewDepth": -0.5756883025169373,
            "opacity": 0.2039215862751007,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187745
          },
          {
            "splatIndex": 60158,
            "originalId": 60158,
            "projectionStatus": "projected",
            "centerPx": [
              1393.0623960065648,
              1015.2603184071763
            ],
            "footprintPx": {
              "majorRadiusPx": 78.984849,
              "minorRadiusPx": 69.077361,
              "areaPx": 17140.733311
            },
            "coverageWeight": 0.0010008086137529195,
            "inverseConic": [
              0.00017129496421789726,
              -0.000020521395550631914,
              0.00019856696535894394
            ],
            "viewDepth": -0.5409248471260071,
            "opacity": 0.301960825920105,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187748
          },
          {
            "splatIndex": 61313,
            "originalId": 61313,
            "projectionStatus": "projected",
            "centerPx": [
              1524.5969376275154,
              1002.4628622636711
            ],
            "footprintPx": {
              "majorRadiusPx": 143.340052,
              "minorRadiusPx": 51.795045,
              "areaPx": 23324.140327
            },
            "coverageWeight": 1.4695902553149392e-8,
            "inverseConic": [
              0.00027241347073870073,
              0.00014983571058518227,
              0.00014901200573703359
            ],
            "viewDepth": -0.530684232711792,
            "opacity": 0.1882352977991104,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187757
          },
          {
            "splatIndex": 43622,
            "originalId": 43622,
            "projectionStatus": "projected",
            "centerPx": [
              1593.8532222104955,
              1005.0106006360467
            ],
            "footprintPx": {
              "majorRadiusPx": 119.454829,
              "minorRadiusPx": 40.340062,
              "areaPx": 15138.754649
            },
            "coverageWeight": 0.0001168611867702955,
            "inverseConic": [
              0.0000809592042922423,
              -0.00007618862532763476,
              0.0006036275991475545
            ],
            "viewDepth": -0.5231723785400391,
            "opacity": 0.7843137383460999,
            "tileIndex": 12606,
            "tileX": 78,
            "tileY": 58,
            "projectedIndex": 1187751
          }
        ],
        "retainedContributors": [
          {
            "splatIndex": 31170,
            "originalId": 31170,
            "retentionStatus": "retained",
            "retentionWeight": 1.287767435593049e-9,
            "occlusionWeight": 2.211195388678571e-9,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 6.712557222722661e-9,
            "centerPx": [
              1425.2655387197015,
              1002.3003284061407
            ],
            "inverseConic": [
              0.0002263642748485994,
              0.00045037531291577335,
              0.003181376073598985
            ],
            "viewDepth": -0.7156385183334351,
            "opacity": 0.3294117748737335,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 57627,
            "originalId": 57627,
            "retentionStatus": "retained",
            "retentionWeight": 0.000016757489705491977,
            "occlusionWeight": 0.00003000571689487659,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.00006539707493388762,
            "centerPx": [
              1395.5761692111078,
              1001.5420620587691
            ],
            "inverseConic": [
              0.0003892828042615123,
              0.000039827510567748775,
              0.0007829258669935376
            ],
            "viewDepth": -0.7022091746330261,
            "opacity": 0.4588235318660736,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 77174,
            "originalId": 77174,
            "retentionStatus": "retained",
            "retentionWeight": 4.311068850454383e-16,
            "occlusionWeight": 7.561965499192111e-16,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 2.216438102056823e-15,
            "centerPx": [
              1407.255728860512,
              1007.9650279516037
            ],
            "inverseConic": [
              0.0006776023187830473,
              0.0012725546279893458,
              0.003373900510995954
            ],
            "viewDepth": -0.6992390155792236,
            "opacity": 0.34117648005485535,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 57631,
            "originalId": 57631,
            "retentionStatus": "retained",
            "retentionWeight": 1.961085269263992e-30,
            "occlusionWeight": 3.822110764893061e-30,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 1.2337191337030922e-29,
            "centerPx": [
              1389.3917903526299,
              998.2095465631037
            ],
            "inverseConic": [
              0.0020210106547572724,
              0.003544682673914741,
              0.008666196768203181
            ],
            "viewDepth": -0.6938897371292114,
            "opacity": 0.30980396270751953,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 3837,
            "originalId": 3837,
            "retentionStatus": "retained",
            "retentionWeight": 3.695035551406295e-31,
            "occlusionWeight": 6.72111175557886e-31,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 8.442775721698126e-31,
            "centerPx": [
              1382.3829455893017,
              1002.4336636105969
            ],
            "inverseConic": [
              0.0013468788951966622,
              0.0035652498711307035,
              0.011747389509600085
            ],
            "viewDepth": -0.6908541917800903,
            "opacity": 0.7960784435272217,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 37163,
            "originalId": 37163,
            "retentionStatus": "retained",
            "retentionWeight": 1.6806627424558687e-9,
            "occlusionWeight": 2.9689736688787914e-9,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 3.605182266163045e-9,
            "centerPx": [
              1376.0832502369328,
              1003.1507816525003
            ],
            "inverseConic": [
              0.0005694787359793485,
              0.000752227353997632,
              0.0026831591931495615
            ],
            "viewDepth": -0.6893255710601807,
            "opacity": 0.8235294222831726,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 91789,
            "originalId": 91789,
            "retentionStatus": "retained",
            "retentionWeight": 0.0000011267788149949594,
            "occlusionWeight": 0.0000055930875115428,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.000008591790782322694,
            "centerPx": [
              1392.0644542053765,
              1039.4312355720476
            ],
            "inverseConic": [
              0.00020296523902177583,
              0.0000967969512482363,
              0.000801138195198868
            ],
            "viewDepth": -0.6801083087921143,
            "opacity": 0.6509804129600525,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 91788,
            "originalId": 91788,
            "retentionStatus": "retained",
            "retentionWeight": 0.000003916363124687248,
            "occlusionWeight": 0.0000222711053816995,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.00006527737603166164,
            "centerPx": [
              1375.7211198513799,
              1044.5296392895611
            ],
            "inverseConic": [
              0.0004422065380150309,
              -0.000017285687247407144,
              0.00045704353385255306
            ],
            "viewDepth": -0.6799551248550415,
            "opacity": 0.34117648005485535,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 78523,
            "originalId": 78523,
            "retentionStatus": "retained",
            "retentionWeight": 0.000094168004335807,
            "occlusionWeight": 0.00046217635019576113,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.0010812381641347143,
            "centerPx": [
              1403.7529600661137,
              1045.8314351869078
            ],
            "inverseConic": [
              0.00042781133615219625,
              -0.00026390048233446926,
              0.0003060390268536775
            ],
            "viewDepth": -0.675216555595398,
            "opacity": 0.4274510145187378,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 92947,
            "originalId": 92947,
            "retentionStatus": "retained",
            "retentionWeight": 0.000008541346818852618,
            "occlusionWeight": 0.000017922473540458204,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.00003436263536044944,
            "centerPx": [
              1560.8199915280775,
              1002.1288633076945
            ],
            "inverseConic": [
              0.00010774236940076189,
              -0.000027757565350785574,
              0.00007330906693199158
            ],
            "viewDepth": -0.670764684677124,
            "opacity": 0.5215686559677124,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 3753,
            "originalId": 3753,
            "retentionStatus": "retained",
            "retentionWeight": 0.000023933970748923174,
            "occlusionWeight": 0.00007632940880500295,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 0.0004423635691735829,
            "centerPx": [
              1339.7277086582135,
              1042.7850349709968
            ],
            "inverseConic": [
              0.0003763687920595599,
              -0.000014026279622282711,
              0.0004225461187140017
            ],
            "viewDepth": -0.6473754644393921,
            "opacity": 0.1725490391254425,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 34377,
            "originalId": 34377,
            "retentionStatus": "retained",
            "retentionWeight": 0.00012509647610907648,
            "occlusionWeight": 0.0004175672161844982,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 0.0011831070831399627,
            "centerPx": [
              1363.9440874961092,
              1038.1366680430042
            ],
            "inverseConic": [
              0.00018199375440397164,
              -0.000038135877101722395,
              0.0002606595825832702
            ],
            "viewDepth": -0.6401479244232178,
            "opacity": 0.3529411852359772,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 31570,
            "originalId": 31570,
            "retentionStatus": "retained",
            "retentionWeight": 0.000001799259978916731,
            "occlusionWeight": 0.0000065373687088359595,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 0.000025258014063109544,
            "centerPx": [
              1400.9994873269977,
              1034.2070467679628
            ],
            "inverseConic": [
              0.0003736917091809961,
              -0.0000037169958751212207,
              0.0005670741521262572
            ],
            "viewDepth": -0.6287059187889099,
            "opacity": 0.25882354378700256,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 40061,
            "originalId": 40061,
            "retentionStatus": "retained",
            "retentionWeight": 0.00001365368630488207,
            "occlusionWeight": 0.00003977536283931665,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 0.00016359221785422172,
            "centerPx": [
              1370.998663543438,
              1019.4185965143614
            ],
            "inverseConic": [
              0.0005432806948861568,
              -0.00024244086484901024,
              0.0011384022269242434
            ],
            "viewDepth": -0.5822826623916626,
            "opacity": 0.24313725531101227,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 35925,
            "originalId": 35925,
            "retentionStatus": "retained",
            "retentionWeight": 2.1433962751286312e-12,
            "occlusionWeight": 2.1590614148339724e-12,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 2.685661720872036e-12,
            "centerPx": [
              1475.2668462541412,
              990.3707046670245
            ],
            "inverseConic": [
              0.0003832074704682586,
              0.0007930306589519384,
              0.0030143240730350217
            ],
            "viewDepth": -0.5810396075248718,
            "opacity": 0.8039215803146362,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 62369,
            "originalId": 62369,
            "retentionStatus": "retained",
            "retentionWeight": 0.00017930704108040277,
            "occlusionWeight": 0.0004899086920728905,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 0.0024024366474473106,
            "centerPx": [
              1341.7323344579327,
              1015.4867979338438
            ],
            "inverseConic": [
              0.00016337211784589356,
              -0.00002403025214865511,
              0.0002484697290613876
            ],
            "viewDepth": -0.5756883025169373,
            "opacity": 0.2039215862751007,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 60158,
            "originalId": 60158,
            "retentionStatus": "retained",
            "retentionWeight": 0.00012643209349187144,
            "occlusionWeight": 0.0003022049955967869,
            "overflowReason": "none",
            "retentionBand": "back",
            "retained": true,
            "coverageWeight": 0.0010008086137529195,
            "centerPx": [
              1393.0623960065648,
              1015.2603184071763
            ],
            "inverseConic": [
              0.00017129496421789726,
              -0.000020521395550631914,
              0.00019856696535894394
            ],
            "viewDepth": -0.5409248471260071,
            "opacity": 0.301960825920105,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 61313,
            "originalId": 61313,
            "retentionStatus": "retained",
            "retentionWeight": 7.663604136043684e-10,
            "occlusionWeight": 2.7662875935187827e-9,
            "overflowReason": "none",
            "retentionBand": "back",
            "retained": true,
            "coverageWeight": 1.4695902553149392e-8,
            "centerPx": [
              1524.5969376275154,
              1002.4628622636711
            ],
            "inverseConic": [
              0.00027241347073870073,
              0.00014983571058518227,
              0.00014901200573703359
            ],
            "viewDepth": -0.530684232711792,
            "opacity": 0.1882352977991104,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 43622,
            "originalId": 43622,
            "retentionStatus": "retained",
            "retentionWeight": 0.000014517799851052434,
            "occlusionWeight": 0.00009165583426337224,
            "overflowReason": "none",
            "retentionBand": "back",
            "retained": true,
            "coverageWeight": 0.0001168611867702955,
            "centerPx": [
              1593.8532222104955,
              1005.0106006360467
            ],
            "inverseConic": [
              0.0000809592042922423,
              -0.00007618862532763476,
              0.0006036275991475545
            ],
            "viewDepth": -0.5231723785400391,
            "opacity": 0.7843137383460999,
            "tileIndex": 12606,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          }
        ],
        "droppedContributors": [],
        "traceRecord": {
          "schemaVersion": 1,
          "anchorPixel": {
            "id": "lacunar-hole-dessert-1260-930",
            "kind": "lacunar-hole",
            "x": 1260,
            "y": 930,
            "description": "Dessert close-view hole where same-pixel projection, retention, order, and accumulation are missing.",
            "canonicalTileAddress": null
          },
          "tileAddress": {
            "tileSizePx": 16,
            "tileX": 78,
            "tileY": 58,
            "tileIndex": 12606,
            "localX": 12,
            "localY": 2
          },
          "projectedContributors": [
            {
              "splatIndex": 31170,
              "originalId": 31170,
              "projectionStatus": "projected",
              "centerPx": [
                1425.2655387197015,
                1002.3003284061407
              ],
              "footprintPx": {
                "majorRadiusPx": 79.2437,
                "minorRadiusPx": 17.545227,
                "areaPx": 4367.909292
              },
              "coverageWeight": 6.712557222722661e-9,
              "inverseConic": [
                0.0002263642748485994,
                0.00045037531291577335,
                0.003181376073598985
              ],
              "viewDepth": -0.7156385183334351,
              "opacity": 0.3294117748737335,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187758
            },
            {
              "splatIndex": 57627,
              "originalId": 57627,
              "projectionStatus": "projected",
              "centerPx": [
                1395.5761692111078,
                1001.5420620587691
              ],
              "footprintPx": {
                "majorRadiusPx": 50.945297,
                "minorRadiusPx": 35.648074,
                "areaPx": 5705.451783
              },
              "coverageWeight": 0.00006539707493388762,
              "inverseConic": [
                0.0003892828042615123,
                0.000039827510567748775,
                0.0007829258669935376
              ],
              "viewDepth": -0.7022091746330261,
              "opacity": 0.4588235318660736,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187752
            },
            {
              "splatIndex": 77174,
              "originalId": 77174,
              "projectionStatus": "projected",
              "centerPx": [
                1407.255728860512,
                1007.9650279516037
              ],
              "footprintPx": {
                "majorRadiusPx": 76.279611,
                "minorRadiusPx": 16.054778,
                "areaPx": 3847.358463
              },
              "coverageWeight": 2.216438102056823e-15,
              "inverseConic": [
                0.0006776023187830473,
                0.0012725546279893458,
                0.003373900510995954
              ],
              "viewDepth": -0.6992390155792236,
              "opacity": 0.34117648005485535,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187761
            },
            {
              "splatIndex": 57631,
              "originalId": 57631,
              "projectionStatus": "projected",
              "centerPx": [
                1389.3917903526299,
                998.2095465631037
              ],
              "footprintPx": {
                "majorRadiusPx": 45.39981,
                "minorRadiusPx": 9.900486,
                "areaPx": 1412.083575
              },
              "coverageWeight": 1.2337191337030922e-29,
              "inverseConic": [
                0.0020210106547572724,
                0.003544682673914741,
                0.008666196768203181
              ],
              "viewDepth": -0.6938897371292114,
              "opacity": 0.30980396270751953,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187762
            },
            {
              "splatIndex": 3837,
              "originalId": 3837,
              "projectionStatus": "projected",
              "centerPx": [
                1382.3829455893017,
                1002.4336636105969
              ],
              "footprintPx": {
                "majorRadiusPx": 64.271322,
                "minorRadiusPx": 8.820872,
                "areaPx": 1781.060302
              },
              "coverageWeight": 8.442775721698126e-31,
              "inverseConic": [
                0.0013468788951966622,
                0.0035652498711307035,
                0.011747389509600085
              ],
              "viewDepth": -0.6908541917800903,
              "opacity": 0.7960784435272217,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187763
            },
            {
              "splatIndex": 37163,
              "originalId": 37163,
              "projectionStatus": "projected",
              "centerPx": [
                1376.0832502369328,
                1003.1507816525003
              ],
              "footprintPx": {
                "majorRadiusPx": 55.122769,
                "minorRadiusPx": 18.494654,
                "areaPx": 3202.779948
              },
              "coverageWeight": 3.605182266163045e-9,
              "inverseConic": [
                0.0005694787359793485,
                0.000752227353997632,
                0.0026831591931495615
              ],
              "viewDepth": -0.6893255710601807,
              "opacity": 0.8235294222831726,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187759
            },
            {
              "splatIndex": 91789,
              "originalId": 91789,
              "projectionStatus": "projected",
              "centerPx": [
                1392.0644542053765,
                1039.4312355720476
              ],
              "footprintPx": {
                "majorRadiusPx": 72.992417,
                "minorRadiusPx": 34.998168,
                "areaPx": 8025.515417
              },
              "coverageWeight": 0.000008591790782322694,
              "inverseConic": [
                0.00020296523902177583,
                0.0000967969512482363,
                0.000801138195198868
              ],
              "viewDepth": -0.6801083087921143,
              "opacity": 0.6509804129600525,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187756
            },
            {
              "splatIndex": 91788,
              "originalId": 91788,
              "projectionStatus": "projected",
              "centerPx": [
                1375.7211198513799,
                1044.5296392895611
              ],
              "footprintPx": {
                "majorRadiusPx": 48.178663,
                "minorRadiusPx": 46.20353,
                "areaPx": 6993.261618
              },
              "coverageWeight": 0.00006527737603166164,
              "inverseConic": [
                0.0004422065380150309,
                -0.000017285687247407144,
                0.00045704353385255306
              ],
              "viewDepth": -0.6799551248550415,
              "opacity": 0.34117648005485535,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187753
            },
            {
              "splatIndex": 78523,
              "originalId": 78523,
              "projectionStatus": "projected",
              "centerPx": [
                1403.7529600661137,
                1045.8314351869078
              ],
              "footprintPx": {
                "majorRadiusPx": 102.01318,
                "minorRadiusPx": 39.59788,
                "areaPx": 12690.481225
              },
              "coverageWeight": 0.0010812381641347143,
              "inverseConic": [
                0.00042781133615219625,
                -0.00026390048233446926,
                0.0003060390268536775
              ],
              "viewDepth": -0.675216555595398,
              "opacity": 0.4274510145187378,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187747
            },
            {
              "splatIndex": 92947,
              "originalId": 92947,
              "projectionStatus": "projected",
              "centerPx": [
                1560.8199915280775,
                1002.1288633076945
              ],
              "footprintPx": {
                "majorRadiusPx": 131.462522,
                "minorRadiusPx": 90.097738,
                "areaPx": 37210.518225
              },
              "coverageWeight": 0.00003436263536044944,
              "inverseConic": [
                0.00010774236940076189,
                -0.000027757565350785574,
                0.00007330906693199158
              ],
              "viewDepth": -0.670764684677124,
              "opacity": 0.5215686559677124,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187754
            },
            {
              "splatIndex": 3753,
              "originalId": 3753,
              "projectionStatus": "projected",
              "centerPx": [
                1339.7277086582135,
                1042.7850349709968
              ],
              "footprintPx": {
                "majorRadiusPx": 51.816795,
                "minorRadiusPx": 48.4233,
                "areaPx": 7882.696509
              },
              "coverageWeight": 0.0004423635691735829,
              "inverseConic": [
                0.0003763687920595599,
                -0.000014026279622282711,
                0.0004225461187140017
              ],
              "viewDepth": -0.6473754644393921,
              "opacity": 0.1725490391254425,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187749
            },
            {
              "splatIndex": 34377,
              "originalId": 34377,
              "projectionStatus": "projected",
              "centerPx": [
                1363.9440874961092,
                1038.1366680430042
              ],
              "footprintPx": {
                "majorRadiusPx": 77.488788,
                "minorRadiusPx": 60.180726,
                "areaPx": 14650.288075
              },
              "coverageWeight": 0.0011831070831399627,
              "inverseConic": [
                0.00018199375440397164,
                -0.000038135877101722395,
                0.0002606595825832702
              ],
              "viewDepth": -0.6401479244232178,
              "opacity": 0.3529411852359772,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187746
            },
            {
              "splatIndex": 31570,
              "originalId": 31570,
              "projectionStatus": "projected",
              "centerPx": [
                1400.9994873269977,
                1034.2070467679628
              ],
              "footprintPx": {
                "majorRadiusPx": 51.735038,
                "minorRadiusPx": 41.990663,
                "areaPx": 6824.759838
              },
              "coverageWeight": 0.000025258014063109544,
              "inverseConic": [
                0.0003736917091809961,
                -0.0000037169958751212207,
                0.0005670741521262572
              ],
              "viewDepth": -0.6287059187889099,
              "opacity": 0.25882354378700256,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187755
            },
            {
              "splatIndex": 40061,
              "originalId": 40061,
              "projectionStatus": "projected",
              "centerPx": [
                1370.998663543438,
                1019.4185965143614
              ],
              "footprintPx": {
                "majorRadiusPx": 46.777075,
                "minorRadiusPx": 28.575344,
                "areaPx": 4199.275805
              },
              "coverageWeight": 0.00016359221785422172,
              "inverseConic": [
                0.0005432806948861568,
                -0.00024244086484901024,
                0.0011384022269242434
              ],
              "viewDepth": -0.5822826623916626,
              "opacity": 0.24313725531101227,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187750
            },
            {
              "splatIndex": 35925,
              "originalId": 35925,
              "projectionStatus": "projected",
              "centerPx": [
                1475.2668462541412,
                990.3707046670245
              ],
              "footprintPx": {
                "majorRadiusPx": 78.405535,
                "minorRadiusPx": 17.582156,
                "areaPx": 4330.805944
              },
              "coverageWeight": 2.685661720872036e-12,
              "inverseConic": [
                0.0003832074704682586,
                0.0007930306589519384,
                0.0030143240730350217
              ],
              "viewDepth": -0.5810396075248718,
              "opacity": 0.8039215803146362,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187760
            },
            {
              "splatIndex": 62369,
              "originalId": 62369,
              "projectionStatus": "projected",
              "centerPx": [
                1341.7323344579327,
                1015.4867979338438
              ],
              "footprintPx": {
                "majorRadiusPx": 79.794649,
                "minorRadiusPx": 62.648649,
                "areaPx": 15704.906441
              },
              "coverageWeight": 0.0024024366474473106,
              "inverseConic": [
                0.00016337211784589356,
                -0.00002403025214865511,
                0.0002484697290613876
              ],
              "viewDepth": -0.5756883025169373,
              "opacity": 0.2039215862751007,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187745
            },
            {
              "splatIndex": 60158,
              "originalId": 60158,
              "projectionStatus": "projected",
              "centerPx": [
                1393.0623960065648,
                1015.2603184071763
              ],
              "footprintPx": {
                "majorRadiusPx": 78.984849,
                "minorRadiusPx": 69.077361,
                "areaPx": 17140.733311
              },
              "coverageWeight": 0.0010008086137529195,
              "inverseConic": [
                0.00017129496421789726,
                -0.000020521395550631914,
                0.00019856696535894394
              ],
              "viewDepth": -0.5409248471260071,
              "opacity": 0.301960825920105,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187748
            },
            {
              "splatIndex": 61313,
              "originalId": 61313,
              "projectionStatus": "projected",
              "centerPx": [
                1524.5969376275154,
                1002.4628622636711
              ],
              "footprintPx": {
                "majorRadiusPx": 143.340052,
                "minorRadiusPx": 51.795045,
                "areaPx": 23324.140327
              },
              "coverageWeight": 1.4695902553149392e-8,
              "inverseConic": [
                0.00027241347073870073,
                0.00014983571058518227,
                0.00014901200573703359
              ],
              "viewDepth": -0.530684232711792,
              "opacity": 0.1882352977991104,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187757
            },
            {
              "splatIndex": 43622,
              "originalId": 43622,
              "projectionStatus": "projected",
              "centerPx": [
                1593.8532222104955,
                1005.0106006360467
              ],
              "footprintPx": {
                "majorRadiusPx": 119.454829,
                "minorRadiusPx": 40.340062,
                "areaPx": 15138.754649
              },
              "coverageWeight": 0.0001168611867702955,
              "inverseConic": [
                0.0000809592042922423,
                -0.00007618862532763476,
                0.0006036275991475545
              ],
              "viewDepth": -0.5231723785400391,
              "opacity": 0.7843137383460999,
              "tileIndex": 12606,
              "tileX": 78,
              "tileY": 58,
              "projectedIndex": 1187751
            }
          ],
          "retainedContributors": [
            {
              "splatIndex": 31170,
              "originalId": 31170,
              "retentionStatus": "retained",
              "retentionWeight": 1.287767435593049e-9,
              "occlusionWeight": 2.211195388678571e-9,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 6.712557222722661e-9,
              "centerPx": [
                1425.2655387197015,
                1002.3003284061407
              ],
              "inverseConic": [
                0.0002263642748485994,
                0.00045037531291577335,
                0.003181376073598985
              ],
              "viewDepth": -0.7156385183334351,
              "opacity": 0.3294117748737335,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 57627,
              "originalId": 57627,
              "retentionStatus": "retained",
              "retentionWeight": 0.000016757489705491977,
              "occlusionWeight": 0.00003000571689487659,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.00006539707493388762,
              "centerPx": [
                1395.5761692111078,
                1001.5420620587691
              ],
              "inverseConic": [
                0.0003892828042615123,
                0.000039827510567748775,
                0.0007829258669935376
              ],
              "viewDepth": -0.7022091746330261,
              "opacity": 0.4588235318660736,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 77174,
              "originalId": 77174,
              "retentionStatus": "retained",
              "retentionWeight": 4.311068850454383e-16,
              "occlusionWeight": 7.561965499192111e-16,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 2.216438102056823e-15,
              "centerPx": [
                1407.255728860512,
                1007.9650279516037
              ],
              "inverseConic": [
                0.0006776023187830473,
                0.0012725546279893458,
                0.003373900510995954
              ],
              "viewDepth": -0.6992390155792236,
              "opacity": 0.34117648005485535,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 57631,
              "originalId": 57631,
              "retentionStatus": "retained",
              "retentionWeight": 1.961085269263992e-30,
              "occlusionWeight": 3.822110764893061e-30,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 1.2337191337030922e-29,
              "centerPx": [
                1389.3917903526299,
                998.2095465631037
              ],
              "inverseConic": [
                0.0020210106547572724,
                0.003544682673914741,
                0.008666196768203181
              ],
              "viewDepth": -0.6938897371292114,
              "opacity": 0.30980396270751953,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 3837,
              "originalId": 3837,
              "retentionStatus": "retained",
              "retentionWeight": 3.695035551406295e-31,
              "occlusionWeight": 6.72111175557886e-31,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 8.442775721698126e-31,
              "centerPx": [
                1382.3829455893017,
                1002.4336636105969
              ],
              "inverseConic": [
                0.0013468788951966622,
                0.0035652498711307035,
                0.011747389509600085
              ],
              "viewDepth": -0.6908541917800903,
              "opacity": 0.7960784435272217,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 37163,
              "originalId": 37163,
              "retentionStatus": "retained",
              "retentionWeight": 1.6806627424558687e-9,
              "occlusionWeight": 2.9689736688787914e-9,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 3.605182266163045e-9,
              "centerPx": [
                1376.0832502369328,
                1003.1507816525003
              ],
              "inverseConic": [
                0.0005694787359793485,
                0.000752227353997632,
                0.0026831591931495615
              ],
              "viewDepth": -0.6893255710601807,
              "opacity": 0.8235294222831726,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 91789,
              "originalId": 91789,
              "retentionStatus": "retained",
              "retentionWeight": 0.0000011267788149949594,
              "occlusionWeight": 0.0000055930875115428,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.000008591790782322694,
              "centerPx": [
                1392.0644542053765,
                1039.4312355720476
              ],
              "inverseConic": [
                0.00020296523902177583,
                0.0000967969512482363,
                0.000801138195198868
              ],
              "viewDepth": -0.6801083087921143,
              "opacity": 0.6509804129600525,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 91788,
              "originalId": 91788,
              "retentionStatus": "retained",
              "retentionWeight": 0.000003916363124687248,
              "occlusionWeight": 0.0000222711053816995,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.00006527737603166164,
              "centerPx": [
                1375.7211198513799,
                1044.5296392895611
              ],
              "inverseConic": [
                0.0004422065380150309,
                -0.000017285687247407144,
                0.00045704353385255306
              ],
              "viewDepth": -0.6799551248550415,
              "opacity": 0.34117648005485535,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 78523,
              "originalId": 78523,
              "retentionStatus": "retained",
              "retentionWeight": 0.000094168004335807,
              "occlusionWeight": 0.00046217635019576113,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.0010812381641347143,
              "centerPx": [
                1403.7529600661137,
                1045.8314351869078
              ],
              "inverseConic": [
                0.00042781133615219625,
                -0.00026390048233446926,
                0.0003060390268536775
              ],
              "viewDepth": -0.675216555595398,
              "opacity": 0.4274510145187378,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 92947,
              "originalId": 92947,
              "retentionStatus": "retained",
              "retentionWeight": 0.000008541346818852618,
              "occlusionWeight": 0.000017922473540458204,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.00003436263536044944,
              "centerPx": [
                1560.8199915280775,
                1002.1288633076945
              ],
              "inverseConic": [
                0.00010774236940076189,
                -0.000027757565350785574,
                0.00007330906693199158
              ],
              "viewDepth": -0.670764684677124,
              "opacity": 0.5215686559677124,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 3753,
              "originalId": 3753,
              "retentionStatus": "retained",
              "retentionWeight": 0.000023933970748923174,
              "occlusionWeight": 0.00007632940880500295,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 0.0004423635691735829,
              "centerPx": [
                1339.7277086582135,
                1042.7850349709968
              ],
              "inverseConic": [
                0.0003763687920595599,
                -0.000014026279622282711,
                0.0004225461187140017
              ],
              "viewDepth": -0.6473754644393921,
              "opacity": 0.1725490391254425,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 34377,
              "originalId": 34377,
              "retentionStatus": "retained",
              "retentionWeight": 0.00012509647610907648,
              "occlusionWeight": 0.0004175672161844982,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 0.0011831070831399627,
              "centerPx": [
                1363.9440874961092,
                1038.1366680430042
              ],
              "inverseConic": [
                0.00018199375440397164,
                -0.000038135877101722395,
                0.0002606595825832702
              ],
              "viewDepth": -0.6401479244232178,
              "opacity": 0.3529411852359772,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 31570,
              "originalId": 31570,
              "retentionStatus": "retained",
              "retentionWeight": 0.000001799259978916731,
              "occlusionWeight": 0.0000065373687088359595,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 0.000025258014063109544,
              "centerPx": [
                1400.9994873269977,
                1034.2070467679628
              ],
              "inverseConic": [
                0.0003736917091809961,
                -0.0000037169958751212207,
                0.0005670741521262572
              ],
              "viewDepth": -0.6287059187889099,
              "opacity": 0.25882354378700256,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 40061,
              "originalId": 40061,
              "retentionStatus": "retained",
              "retentionWeight": 0.00001365368630488207,
              "occlusionWeight": 0.00003977536283931665,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 0.00016359221785422172,
              "centerPx": [
                1370.998663543438,
                1019.4185965143614
              ],
              "inverseConic": [
                0.0005432806948861568,
                -0.00024244086484901024,
                0.0011384022269242434
              ],
              "viewDepth": -0.5822826623916626,
              "opacity": 0.24313725531101227,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 35925,
              "originalId": 35925,
              "retentionStatus": "retained",
              "retentionWeight": 2.1433962751286312e-12,
              "occlusionWeight": 2.1590614148339724e-12,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 2.685661720872036e-12,
              "centerPx": [
                1475.2668462541412,
                990.3707046670245
              ],
              "inverseConic": [
                0.0003832074704682586,
                0.0007930306589519384,
                0.0030143240730350217
              ],
              "viewDepth": -0.5810396075248718,
              "opacity": 0.8039215803146362,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 62369,
              "originalId": 62369,
              "retentionStatus": "retained",
              "retentionWeight": 0.00017930704108040277,
              "occlusionWeight": 0.0004899086920728905,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 0.0024024366474473106,
              "centerPx": [
                1341.7323344579327,
                1015.4867979338438
              ],
              "inverseConic": [
                0.00016337211784589356,
                -0.00002403025214865511,
                0.0002484697290613876
              ],
              "viewDepth": -0.5756883025169373,
              "opacity": 0.2039215862751007,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 60158,
              "originalId": 60158,
              "retentionStatus": "retained",
              "retentionWeight": 0.00012643209349187144,
              "occlusionWeight": 0.0003022049955967869,
              "overflowReason": "none",
              "retentionBand": "back",
              "retained": true,
              "coverageWeight": 0.0010008086137529195,
              "centerPx": [
                1393.0623960065648,
                1015.2603184071763
              ],
              "inverseConic": [
                0.00017129496421789726,
                -0.000020521395550631914,
                0.00019856696535894394
              ],
              "viewDepth": -0.5409248471260071,
              "opacity": 0.301960825920105,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 61313,
              "originalId": 61313,
              "retentionStatus": "retained",
              "retentionWeight": 7.663604136043684e-10,
              "occlusionWeight": 2.7662875935187827e-9,
              "overflowReason": "none",
              "retentionBand": "back",
              "retained": true,
              "coverageWeight": 1.4695902553149392e-8,
              "centerPx": [
                1524.5969376275154,
                1002.4628622636711
              ],
              "inverseConic": [
                0.00027241347073870073,
                0.00014983571058518227,
                0.00014901200573703359
              ],
              "viewDepth": -0.530684232711792,
              "opacity": 0.1882352977991104,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 43622,
              "originalId": 43622,
              "retentionStatus": "retained",
              "retentionWeight": 0.000014517799851052434,
              "occlusionWeight": 0.00009165583426337224,
              "overflowReason": "none",
              "retentionBand": "back",
              "retained": true,
              "coverageWeight": 0.0001168611867702955,
              "centerPx": [
                1593.8532222104955,
                1005.0106006360467
              ],
              "inverseConic": [
                0.0000809592042922423,
                -0.00007618862532763476,
                0.0006036275991475545
              ],
              "viewDepth": -0.5231723785400391,
              "opacity": 0.7843137383460999,
              "tileIndex": 12606,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            }
          ],
          "orderedContributors": [],
          "finalColorAccumulation": {
            "steps": [],
            "outputColor": [
              0,
              0,
              0,
              0
            ]
          },
          "dispatchCache": {
            "tileIndex": 12606,
            "clearFrameId": 0,
            "buildFrameId": 0,
            "compositeFrameId": 0
          },
          "rendererMetadata": {
            "requestedRenderer": "tile-local-visible",
            "effectiveRenderer": "tile-local-visible",
            "requestedArenaBackend": null,
            "effectiveArenaBackend": null,
            "viewport": {
              "width": 3456,
              "height": 1804
            },
            "tileSizePx": 16,
            "maxRefsPerTile": 256
          },
          "deferredFields": {
            "preserved": true,
            "deferredSurface": null,
            "normalSum": null,
            "albedoSum": null,
            "matSum": null,
            "weightSum": null,
            "provisionalDepth": null,
            "confidence": null,
            "lossEvidence": null
          }
        }
      },
      {
        "status": "sufficient",
        "anchorPixel": {
          "id": "dense-foreground-leak-1580-1260",
          "kind": "dense-foreground-leak",
          "x": 1580,
          "y": 1260,
          "description": "Dense foreground leak where alpha/conic/retention causes must be separated by contributor identity.",
          "canonicalTileAddress": null
        },
        "tileAddress": {
          "tileSizePx": 16,
          "tileX": 98,
          "tileY": 78,
          "tileIndex": 16946,
          "localX": 12,
          "localY": 12
        },
        "projectedContributors": [
          {
            "splatIndex": 54397,
            "originalId": 54397,
            "projectionStatus": "projected",
            "centerPx": [
              1565.3960466152525,
              1051.8651605165176
            ],
            "footprintPx": {
              "majorRadiusPx": 90.316683,
              "minorRadiusPx": 24.100838,
              "areaPx": 6838.329135
            },
            "coverageWeight": 0.0009330091383682842,
            "inverseConic": [
              0.0016776357647624745,
              -0.00026151019178279365,
              0.00016657046714274912
            ],
            "viewDepth": -0.7084073424339294,
            "opacity": 0.28235292434692383,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913170
          },
          {
            "splatIndex": 85417,
            "originalId": 85417,
            "projectionStatus": "projected",
            "centerPx": [
              1748.8062145467325,
              942.7386289167504
            ],
            "footprintPx": {
              "majorRadiusPx": 109.979777,
              "minorRadiusPx": 77.208596,
              "areaPx": 26676.470178
            },
            "coverageWeight": 0.00002405549917355338,
            "inverseConic": [
              0.00014576032187580052,
              0.00003724748978948944,
              0.00010466708152687385
            ],
            "viewDepth": -0.696622908115387,
            "opacity": 0.7411764860153198,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913177
          },
          {
            "splatIndex": 92896,
            "originalId": 92896,
            "projectionStatus": "projected",
            "centerPx": [
              1593.015892541419,
              1021.296194750957
            ],
            "footprintPx": {
              "majorRadiusPx": 80.543558,
              "minorRadiusPx": 28.120039,
              "areaPx": 7115.355475
            },
            "coverageWeight": 0.00007082108796661,
            "inverseConic": [
              0.0011816039168376963,
              0.00029209527901506434,
              0.0002371879042847051
            ],
            "viewDepth": -0.692294180393219,
            "opacity": 0.3764705955982208,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913173
          },
          {
            "splatIndex": 78523,
            "originalId": 78523,
            "projectionStatus": "projected",
            "centerPx": [
              1403.7529600661137,
              1045.8314351869078
            ],
            "footprintPx": {
              "majorRadiusPx": 102.01318,
              "minorRadiusPx": 39.59788,
              "areaPx": 12690.481225
            },
            "coverageWeight": 0.0002891649041555365,
            "inverseConic": [
              0.00042781133615219625,
              -0.00026390048233446926,
              0.0003060390268536775
            ],
            "viewDepth": -0.675216555595398,
            "opacity": 0.4274510145187378,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913172
          },
          {
            "splatIndex": 92947,
            "originalId": 92947,
            "projectionStatus": "projected",
            "centerPx": [
              1560.8199915280775,
              1002.1288633076945
            ],
            "footprintPx": {
              "majorRadiusPx": 131.462522,
              "minorRadiusPx": 90.097738,
              "areaPx": 37210.518225
            },
            "coverageWeight": 0.00035614806772968436,
            "inverseConic": [
              0.00010774236940076189,
              -0.000027757565350785574,
              0.00007330906693199158
            ],
            "viewDepth": -0.670764684677124,
            "opacity": 0.5215686559677124,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913171
          },
          {
            "splatIndex": 85423,
            "originalId": 85423,
            "projectionStatus": "projected",
            "centerPx": [
              1752.1406372491558,
              1005.9832518018704
            ],
            "footprintPx": {
              "majorRadiusPx": 85.962941,
              "minorRadiusPx": 65.707294,
              "areaPx": 17744.947702
            },
            "coverageWeight": 0.0000018807826635719695,
            "inverseConic": [
              0.0002306877523590877,
              -0.000009420074795644245,
              0.00013625534986589486
            ],
            "viewDepth": -0.6636021137237549,
            "opacity": 0.5058823823928833,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913180
          },
          {
            "splatIndex": 40428,
            "originalId": 40428,
            "projectionStatus": "projected",
            "centerPx": [
              1603.3031990922325,
              913.8019317942264
            ],
            "footprintPx": {
              "majorRadiusPx": 114.131095,
              "minorRadiusPx": 61.634615,
              "areaPx": 22099.301287
            },
            "coverageWeight": 0.00005361925570902175,
            "inverseConic": [
              0.0002558685351282072,
              0.00003633293339169815,
              0.00008414079258707531
            ],
            "viewDepth": -0.5842319130897522,
            "opacity": 0.9411764740943909,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913175
          },
          {
            "splatIndex": 43409,
            "originalId": 43409,
            "projectionStatus": "projected",
            "centerPx": [
              1639.9056774985722,
              926.0574646863303
            ],
            "footprintPx": {
              "majorRadiusPx": 119.513414,
              "minorRadiusPx": 75.63787,
              "areaPx": 28399.180733
            },
            "coverageWeight": 0.00005605058280991041,
            "inverseConic": [
              0.00017407617693862646,
              -0.000008630577574799333,
              0.00007072683901309152
            ],
            "viewDepth": -0.5715223550796509,
            "opacity": 0.8392156958580017,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913174
          },
          {
            "splatIndex": 45846,
            "originalId": 45846,
            "projectionStatus": "projected",
            "centerPx": [
              1697.7758720351767,
              993.8464921792228
            ],
            "footprintPx": {
              "majorRadiusPx": 107.058671,
              "minorRadiusPx": 88.656222,
              "areaPx": 29818.166739
            },
            "coverageWeight": 0.00002738005510155097,
            "inverseConic": [
              0.00008728182312528806,
              -0.0000011595067839580394,
              0.0001271940090374611
            ],
            "viewDepth": -0.5552724599838257,
            "opacity": 0.8784314393997192,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913176
          },
          {
            "splatIndex": 61313,
            "originalId": 61313,
            "projectionStatus": "projected",
            "centerPx": [
              1524.5969376275154,
              1002.4628622636711
            ],
            "footprintPx": {
              "majorRadiusPx": 143.340052,
              "minorRadiusPx": 51.795045,
              "areaPx": 23324.140327
            },
            "coverageWeight": 0.00000451916842091624,
            "inverseConic": [
              0.00027241347073870073,
              0.00014983571058518227,
              0.00014901200573703359
            ],
            "viewDepth": -0.530684232711792,
            "opacity": 0.1882352977991104,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913178
          },
          {
            "splatIndex": 4002,
            "originalId": 4002,
            "projectionStatus": "projected",
            "centerPx": [
              1836.1650151552965,
              1001.2876894934271
            ],
            "footprintPx": {
              "majorRadiusPx": 95.580938,
              "minorRadiusPx": 88.273818,
              "areaPx": 26506.541632
            },
            "coverageWeight": 0.0000032060307768881387,
            "inverseConic": [
              0.00011461851589570378,
              0.000008410483286284196,
              0.00012317434434610936
            ],
            "viewDepth": -0.5042622089385986,
            "opacity": 0.7647058963775635,
            "tileIndex": 16946,
            "tileX": 98,
            "tileY": 78,
            "projectedIndex": 2913179
          }
        ],
        "retainedContributors": [
          {
            "splatIndex": 54397,
            "originalId": 54397,
            "retentionStatus": "retained",
            "retentionWeight": 0.00004601777784171214,
            "occlusionWeight": 0.00026343785866068877,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.0009330091383682842,
            "centerPx": [
              1565.3960466152525,
              1051.8651605165176
            ],
            "inverseConic": [
              0.0016776357647624745,
              -0.00026151019178279365,
              0.00016657046714274912
            ],
            "viewDepth": -0.7084073424339294,
            "opacity": 0.28235292434692383,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 85417,
            "originalId": 85417,
            "retentionStatus": "retained",
            "retentionWeight": 0.000005860404224741774,
            "occlusionWeight": 0.000017829370346798725,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.00002405549917355338,
            "centerPx": [
              1748.8062145467325,
              942.7386289167504
            ],
            "inverseConic": [
              0.00014576032187580052,
              0.00003724748978948944,
              0.00010466708152687385
            ],
            "viewDepth": -0.696622908115387,
            "opacity": 0.7411764860153198,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 92896,
            "originalId": 92896,
            "retentionStatus": "retained",
            "retentionWeight": 0.000016292756141248365,
            "occlusionWeight": 0.000026662057167703656,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.00007082108796661,
            "centerPx": [
              1593.015892541419,
              1021.296194750957
            ],
            "inverseConic": [
              0.0011816039168376963,
              0.00029209527901506434,
              0.0002371879042847051
            ],
            "viewDepth": -0.692294180393219,
            "opacity": 0.3764705955982208,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 78523,
            "originalId": 78523,
            "retentionStatus": "retained",
            "retentionWeight": 0.00002518416649681736,
            "occlusionWeight": 0.00012360383164449764,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.0002891649041555365,
            "centerPx": [
              1403.7529600661137,
              1045.8314351869078
            ],
            "inverseConic": [
              0.00042781133615219625,
              -0.00026390048233446926,
              0.0003060390268536775
            ],
            "viewDepth": -0.675216555595398,
            "opacity": 0.4274510145187378,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 92947,
            "originalId": 92947,
            "retentionStatus": "retained",
            "retentionWeight": 0.00008852592746261529,
            "occlusionWeight": 0.00018575566901126927,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.00035614806772968436,
            "centerPx": [
              1560.8199915280775,
              1002.1288633076945
            ],
            "inverseConic": [
              0.00010774236940076189,
              -0.000027757565350785574,
              0.00007330906693199158
            ],
            "viewDepth": -0.670764684677124,
            "opacity": 0.5215686559677124,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 85423,
            "originalId": 85423,
            "retentionStatus": "retained",
            "retentionWeight": 3.3988307575771415e-7,
            "occlusionWeight": 9.514548146110207e-7,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.0000018807826635719695,
            "centerPx": [
              1752.1406372491558,
              1005.9832518018704
            ],
            "inverseConic": [
              0.0002306877523590877,
              -0.000009420074795644245,
              0.00013625534986589486
            ],
            "viewDepth": -0.6636021137237549,
            "opacity": 0.5058823823928833,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 40428,
            "originalId": 40428,
            "retentionStatus": "retained",
            "retentionWeight": 0.00001295452489307862,
            "occlusionWeight": 0.00005046518203178263,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 0.00005361925570902175,
            "centerPx": [
              1603.3031990922325,
              913.8019317942264
            ],
            "inverseConic": [
              0.0002558685351282072,
              0.00003633293339169815,
              0.00008414079258707531
            ],
            "viewDepth": -0.5842319130897522,
            "opacity": 0.9411764740943909,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 43409,
            "originalId": 43409,
            "retentionStatus": "retained",
            "retentionWeight": 0.000014975489336335032,
            "occlusionWeight": 0.000047038528856065514,
            "overflowReason": "none",
            "retentionBand": "middle",
            "retained": true,
            "coverageWeight": 0.00005605058280991041,
            "centerPx": [
              1639.9056774985722,
              926.0574646863303
            ],
            "inverseConic": [
              0.00017407617693862646,
              -0.000008630577574799333,
              0.00007072683901309152
            ],
            "viewDepth": -0.5715223550796509,
            "opacity": 0.8392156958580017,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 45846,
            "originalId": 45846,
            "retentionStatus": "retained",
            "retentionWeight": 0.000008286518796534468,
            "occlusionWeight": 0.000024051501213699045,
            "overflowReason": "none",
            "retentionBand": "back",
            "retained": true,
            "coverageWeight": 0.00002738005510155097,
            "centerPx": [
              1697.7758720351767,
              993.8464921792228
            ],
            "inverseConic": [
              0.00008728182312528806,
              -0.0000011595067839580394,
              0.0001271940090374611
            ],
            "viewDepth": -0.5552724599838257,
            "opacity": 0.8784314393997192,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 61313,
            "originalId": 61313,
            "retentionStatus": "retained",
            "retentionWeight": 2.3566512962886845e-7,
            "occlusionWeight": 8.50667013515504e-7,
            "overflowReason": "none",
            "retentionBand": "back",
            "retained": true,
            "coverageWeight": 0.00000451916842091624,
            "centerPx": [
              1524.5969376275154,
              1002.4628622636711
            ],
            "inverseConic": [
              0.00027241347073870073,
              0.00014983571058518227,
              0.00014901200573703359
            ],
            "viewDepth": -0.530684232711792,
            "opacity": 0.1882352977991104,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 4002,
            "originalId": 4002,
            "retentionStatus": "retained",
            "retentionWeight": 3.2546512711743304e-7,
            "occlusionWeight": 0.0000024516706390543004,
            "overflowReason": "none",
            "retentionBand": "back",
            "retained": true,
            "coverageWeight": 0.0000032060307768881387,
            "centerPx": [
              1836.1650151552965,
              1001.2876894934271
            ],
            "inverseConic": [
              0.00011461851589570378,
              0.000008410483286284196,
              0.00012317434434610936
            ],
            "viewDepth": -0.5042622089385986,
            "opacity": 0.7647058963775635,
            "tileIndex": 16946,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          }
        ],
        "droppedContributors": [],
        "traceRecord": {
          "schemaVersion": 1,
          "anchorPixel": {
            "id": "dense-foreground-leak-1580-1260",
            "kind": "dense-foreground-leak",
            "x": 1580,
            "y": 1260,
            "description": "Dense foreground leak where alpha/conic/retention causes must be separated by contributor identity.",
            "canonicalTileAddress": null
          },
          "tileAddress": {
            "tileSizePx": 16,
            "tileX": 98,
            "tileY": 78,
            "tileIndex": 16946,
            "localX": 12,
            "localY": 12
          },
          "projectedContributors": [
            {
              "splatIndex": 54397,
              "originalId": 54397,
              "projectionStatus": "projected",
              "centerPx": [
                1565.3960466152525,
                1051.8651605165176
              ],
              "footprintPx": {
                "majorRadiusPx": 90.316683,
                "minorRadiusPx": 24.100838,
                "areaPx": 6838.329135
              },
              "coverageWeight": 0.0009330091383682842,
              "inverseConic": [
                0.0016776357647624745,
                -0.00026151019178279365,
                0.00016657046714274912
              ],
              "viewDepth": -0.7084073424339294,
              "opacity": 0.28235292434692383,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913170
            },
            {
              "splatIndex": 85417,
              "originalId": 85417,
              "projectionStatus": "projected",
              "centerPx": [
                1748.8062145467325,
                942.7386289167504
              ],
              "footprintPx": {
                "majorRadiusPx": 109.979777,
                "minorRadiusPx": 77.208596,
                "areaPx": 26676.470178
              },
              "coverageWeight": 0.00002405549917355338,
              "inverseConic": [
                0.00014576032187580052,
                0.00003724748978948944,
                0.00010466708152687385
              ],
              "viewDepth": -0.696622908115387,
              "opacity": 0.7411764860153198,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913177
            },
            {
              "splatIndex": 92896,
              "originalId": 92896,
              "projectionStatus": "projected",
              "centerPx": [
                1593.015892541419,
                1021.296194750957
              ],
              "footprintPx": {
                "majorRadiusPx": 80.543558,
                "minorRadiusPx": 28.120039,
                "areaPx": 7115.355475
              },
              "coverageWeight": 0.00007082108796661,
              "inverseConic": [
                0.0011816039168376963,
                0.00029209527901506434,
                0.0002371879042847051
              ],
              "viewDepth": -0.692294180393219,
              "opacity": 0.3764705955982208,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913173
            },
            {
              "splatIndex": 78523,
              "originalId": 78523,
              "projectionStatus": "projected",
              "centerPx": [
                1403.7529600661137,
                1045.8314351869078
              ],
              "footprintPx": {
                "majorRadiusPx": 102.01318,
                "minorRadiusPx": 39.59788,
                "areaPx": 12690.481225
              },
              "coverageWeight": 0.0002891649041555365,
              "inverseConic": [
                0.00042781133615219625,
                -0.00026390048233446926,
                0.0003060390268536775
              ],
              "viewDepth": -0.675216555595398,
              "opacity": 0.4274510145187378,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913172
            },
            {
              "splatIndex": 92947,
              "originalId": 92947,
              "projectionStatus": "projected",
              "centerPx": [
                1560.8199915280775,
                1002.1288633076945
              ],
              "footprintPx": {
                "majorRadiusPx": 131.462522,
                "minorRadiusPx": 90.097738,
                "areaPx": 37210.518225
              },
              "coverageWeight": 0.00035614806772968436,
              "inverseConic": [
                0.00010774236940076189,
                -0.000027757565350785574,
                0.00007330906693199158
              ],
              "viewDepth": -0.670764684677124,
              "opacity": 0.5215686559677124,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913171
            },
            {
              "splatIndex": 85423,
              "originalId": 85423,
              "projectionStatus": "projected",
              "centerPx": [
                1752.1406372491558,
                1005.9832518018704
              ],
              "footprintPx": {
                "majorRadiusPx": 85.962941,
                "minorRadiusPx": 65.707294,
                "areaPx": 17744.947702
              },
              "coverageWeight": 0.0000018807826635719695,
              "inverseConic": [
                0.0002306877523590877,
                -0.000009420074795644245,
                0.00013625534986589486
              ],
              "viewDepth": -0.6636021137237549,
              "opacity": 0.5058823823928833,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913180
            },
            {
              "splatIndex": 40428,
              "originalId": 40428,
              "projectionStatus": "projected",
              "centerPx": [
                1603.3031990922325,
                913.8019317942264
              ],
              "footprintPx": {
                "majorRadiusPx": 114.131095,
                "minorRadiusPx": 61.634615,
                "areaPx": 22099.301287
              },
              "coverageWeight": 0.00005361925570902175,
              "inverseConic": [
                0.0002558685351282072,
                0.00003633293339169815,
                0.00008414079258707531
              ],
              "viewDepth": -0.5842319130897522,
              "opacity": 0.9411764740943909,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913175
            },
            {
              "splatIndex": 43409,
              "originalId": 43409,
              "projectionStatus": "projected",
              "centerPx": [
                1639.9056774985722,
                926.0574646863303
              ],
              "footprintPx": {
                "majorRadiusPx": 119.513414,
                "minorRadiusPx": 75.63787,
                "areaPx": 28399.180733
              },
              "coverageWeight": 0.00005605058280991041,
              "inverseConic": [
                0.00017407617693862646,
                -0.000008630577574799333,
                0.00007072683901309152
              ],
              "viewDepth": -0.5715223550796509,
              "opacity": 0.8392156958580017,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913174
            },
            {
              "splatIndex": 45846,
              "originalId": 45846,
              "projectionStatus": "projected",
              "centerPx": [
                1697.7758720351767,
                993.8464921792228
              ],
              "footprintPx": {
                "majorRadiusPx": 107.058671,
                "minorRadiusPx": 88.656222,
                "areaPx": 29818.166739
              },
              "coverageWeight": 0.00002738005510155097,
              "inverseConic": [
                0.00008728182312528806,
                -0.0000011595067839580394,
                0.0001271940090374611
              ],
              "viewDepth": -0.5552724599838257,
              "opacity": 0.8784314393997192,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913176
            },
            {
              "splatIndex": 61313,
              "originalId": 61313,
              "projectionStatus": "projected",
              "centerPx": [
                1524.5969376275154,
                1002.4628622636711
              ],
              "footprintPx": {
                "majorRadiusPx": 143.340052,
                "minorRadiusPx": 51.795045,
                "areaPx": 23324.140327
              },
              "coverageWeight": 0.00000451916842091624,
              "inverseConic": [
                0.00027241347073870073,
                0.00014983571058518227,
                0.00014901200573703359
              ],
              "viewDepth": -0.530684232711792,
              "opacity": 0.1882352977991104,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913178
            },
            {
              "splatIndex": 4002,
              "originalId": 4002,
              "projectionStatus": "projected",
              "centerPx": [
                1836.1650151552965,
                1001.2876894934271
              ],
              "footprintPx": {
                "majorRadiusPx": 95.580938,
                "minorRadiusPx": 88.273818,
                "areaPx": 26506.541632
              },
              "coverageWeight": 0.0000032060307768881387,
              "inverseConic": [
                0.00011461851589570378,
                0.000008410483286284196,
                0.00012317434434610936
              ],
              "viewDepth": -0.5042622089385986,
              "opacity": 0.7647058963775635,
              "tileIndex": 16946,
              "tileX": 98,
              "tileY": 78,
              "projectedIndex": 2913179
            }
          ],
          "retainedContributors": [
            {
              "splatIndex": 54397,
              "originalId": 54397,
              "retentionStatus": "retained",
              "retentionWeight": 0.00004601777784171214,
              "occlusionWeight": 0.00026343785866068877,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.0009330091383682842,
              "centerPx": [
                1565.3960466152525,
                1051.8651605165176
              ],
              "inverseConic": [
                0.0016776357647624745,
                -0.00026151019178279365,
                0.00016657046714274912
              ],
              "viewDepth": -0.7084073424339294,
              "opacity": 0.28235292434692383,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 85417,
              "originalId": 85417,
              "retentionStatus": "retained",
              "retentionWeight": 0.000005860404224741774,
              "occlusionWeight": 0.000017829370346798725,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.00002405549917355338,
              "centerPx": [
                1748.8062145467325,
                942.7386289167504
              ],
              "inverseConic": [
                0.00014576032187580052,
                0.00003724748978948944,
                0.00010466708152687385
              ],
              "viewDepth": -0.696622908115387,
              "opacity": 0.7411764860153198,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 92896,
              "originalId": 92896,
              "retentionStatus": "retained",
              "retentionWeight": 0.000016292756141248365,
              "occlusionWeight": 0.000026662057167703656,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.00007082108796661,
              "centerPx": [
                1593.015892541419,
                1021.296194750957
              ],
              "inverseConic": [
                0.0011816039168376963,
                0.00029209527901506434,
                0.0002371879042847051
              ],
              "viewDepth": -0.692294180393219,
              "opacity": 0.3764705955982208,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 78523,
              "originalId": 78523,
              "retentionStatus": "retained",
              "retentionWeight": 0.00002518416649681736,
              "occlusionWeight": 0.00012360383164449764,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.0002891649041555365,
              "centerPx": [
                1403.7529600661137,
                1045.8314351869078
              ],
              "inverseConic": [
                0.00042781133615219625,
                -0.00026390048233446926,
                0.0003060390268536775
              ],
              "viewDepth": -0.675216555595398,
              "opacity": 0.4274510145187378,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 92947,
              "originalId": 92947,
              "retentionStatus": "retained",
              "retentionWeight": 0.00008852592746261529,
              "occlusionWeight": 0.00018575566901126927,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.00035614806772968436,
              "centerPx": [
                1560.8199915280775,
                1002.1288633076945
              ],
              "inverseConic": [
                0.00010774236940076189,
                -0.000027757565350785574,
                0.00007330906693199158
              ],
              "viewDepth": -0.670764684677124,
              "opacity": 0.5215686559677124,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 85423,
              "originalId": 85423,
              "retentionStatus": "retained",
              "retentionWeight": 3.3988307575771415e-7,
              "occlusionWeight": 9.514548146110207e-7,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.0000018807826635719695,
              "centerPx": [
                1752.1406372491558,
                1005.9832518018704
              ],
              "inverseConic": [
                0.0002306877523590877,
                -0.000009420074795644245,
                0.00013625534986589486
              ],
              "viewDepth": -0.6636021137237549,
              "opacity": 0.5058823823928833,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 40428,
              "originalId": 40428,
              "retentionStatus": "retained",
              "retentionWeight": 0.00001295452489307862,
              "occlusionWeight": 0.00005046518203178263,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 0.00005361925570902175,
              "centerPx": [
                1603.3031990922325,
                913.8019317942264
              ],
              "inverseConic": [
                0.0002558685351282072,
                0.00003633293339169815,
                0.00008414079258707531
              ],
              "viewDepth": -0.5842319130897522,
              "opacity": 0.9411764740943909,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 43409,
              "originalId": 43409,
              "retentionStatus": "retained",
              "retentionWeight": 0.000014975489336335032,
              "occlusionWeight": 0.000047038528856065514,
              "overflowReason": "none",
              "retentionBand": "middle",
              "retained": true,
              "coverageWeight": 0.00005605058280991041,
              "centerPx": [
                1639.9056774985722,
                926.0574646863303
              ],
              "inverseConic": [
                0.00017407617693862646,
                -0.000008630577574799333,
                0.00007072683901309152
              ],
              "viewDepth": -0.5715223550796509,
              "opacity": 0.8392156958580017,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 45846,
              "originalId": 45846,
              "retentionStatus": "retained",
              "retentionWeight": 0.000008286518796534468,
              "occlusionWeight": 0.000024051501213699045,
              "overflowReason": "none",
              "retentionBand": "back",
              "retained": true,
              "coverageWeight": 0.00002738005510155097,
              "centerPx": [
                1697.7758720351767,
                993.8464921792228
              ],
              "inverseConic": [
                0.00008728182312528806,
                -0.0000011595067839580394,
                0.0001271940090374611
              ],
              "viewDepth": -0.5552724599838257,
              "opacity": 0.8784314393997192,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 61313,
              "originalId": 61313,
              "retentionStatus": "retained",
              "retentionWeight": 2.3566512962886845e-7,
              "occlusionWeight": 8.50667013515504e-7,
              "overflowReason": "none",
              "retentionBand": "back",
              "retained": true,
              "coverageWeight": 0.00000451916842091624,
              "centerPx": [
                1524.5969376275154,
                1002.4628622636711
              ],
              "inverseConic": [
                0.00027241347073870073,
                0.00014983571058518227,
                0.00014901200573703359
              ],
              "viewDepth": -0.530684232711792,
              "opacity": 0.1882352977991104,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 4002,
              "originalId": 4002,
              "retentionStatus": "retained",
              "retentionWeight": 3.2546512711743304e-7,
              "occlusionWeight": 0.0000024516706390543004,
              "overflowReason": "none",
              "retentionBand": "back",
              "retained": true,
              "coverageWeight": 0.0000032060307768881387,
              "centerPx": [
                1836.1650151552965,
                1001.2876894934271
              ],
              "inverseConic": [
                0.00011461851589570378,
                0.000008410483286284196,
                0.00012317434434610936
              ],
              "viewDepth": -0.5042622089385986,
              "opacity": 0.7647058963775635,
              "tileIndex": 16946,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            }
          ],
          "orderedContributors": [],
          "finalColorAccumulation": {
            "steps": [],
            "outputColor": [
              0,
              0,
              0,
              0
            ]
          },
          "dispatchCache": {
            "tileIndex": 16946,
            "clearFrameId": 0,
            "buildFrameId": 0,
            "compositeFrameId": 0
          },
          "rendererMetadata": {
            "requestedRenderer": "tile-local-visible",
            "effectiveRenderer": "tile-local-visible",
            "requestedArenaBackend": null,
            "effectiveArenaBackend": null,
            "viewport": {
              "width": 3456,
              "height": 1804
            },
            "tileSizePx": 16,
            "maxRefsPerTile": 256
          },
          "deferredFields": {
            "preserved": true,
            "deferredSurface": null,
            "normalSum": null,
            "albedoSum": null,
            "matSum": null,
            "weightSum": null,
            "provisionalDepth": null,
            "confidence": null,
            "lossEvidence": null
          }
        }
      },
      {
        "status": "sufficient",
        "anchorPixel": {
          "id": "black-band-dropout-2300-1055",
          "kind": "black-band-dropout",
          "x": 2300,
          "y": 1055,
          "description": "Horizontal band/dropout pixel with known tile address at tileSizePx=16.",
          "canonicalTileAddress": {
            "tileX": 143,
            "tileY": 65,
            "tileIndex": 14183,
            "localX": 12,
            "localY": 15
          }
        },
        "tileAddress": {
          "tileSizePx": 16,
          "tileX": 143,
          "tileY": 65,
          "tileIndex": 14183,
          "localX": 12,
          "localY": 15
        },
        "projectedContributors": [
          {
            "splatIndex": 87386,
            "originalId": 87386,
            "projectionStatus": "projected",
            "centerPx": [
              2116.802795836614,
              1020.0000211992419
            ],
            "footprintPx": {
              "majorRadiusPx": 71.351656,
              "minorRadiusPx": 61.877698,
              "areaPx": 13870.370989
            },
            "coverageWeight": 0.00021563291812395251,
            "inverseConic": [
              0.00021853002002069583,
              0.00003070445583185498,
              0.00023906783613453477
            ],
            "viewDepth": -0.5866499543190002,
            "opacity": 0.35686278343200684,
            "tileIndex": 14183,
            "tileX": 143,
            "tileY": 65,
            "projectedIndex": 2721343
          },
          {
            "splatIndex": 87369,
            "originalId": 87369,
            "projectionStatus": "projected",
            "centerPx": [
              2080.042287645351,
              1024.8105756731634
            ],
            "footprintPx": {
              "majorRadiusPx": 82.232968,
              "minorRadiusPx": 72.121645,
              "areaPx": 18632.085237
            },
            "coverageWeight": 0.00019441714687238104,
            "inverseConic": [
              0.00015402070055196016,
              -0.000015322501887454922,
              0.00018610989570900727
            ],
            "viewDepth": -0.5753166079521179,
            "opacity": 0.7372549176216125,
            "tileIndex": 14183,
            "tileX": 143,
            "tileY": 65,
            "projectedIndex": 2721344
          }
        ],
        "retainedContributors": [
          {
            "splatIndex": 87386,
            "originalId": 87386,
            "retentionStatus": "retained",
            "retentionWeight": 0.00001836837134483122,
            "occlusionWeight": 0.00007695136336127973,
            "overflowReason": "none",
            "retentionBand": "front",
            "retained": true,
            "coverageWeight": 0.00021563291812395251,
            "centerPx": [
              2116.802795836614,
              1020.0000211992419
            ],
            "inverseConic": [
              0.00021853002002069583,
              0.00003070445583185498,
              0.00023906783613453477
            ],
            "viewDepth": -0.5866499543190002,
            "opacity": 0.35686278343200684,
            "tileIndex": 14183,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          },
          {
            "splatIndex": 87369,
            "originalId": 87369,
            "retentionStatus": "retained",
            "retentionWeight": 0.000048753275508900117,
            "occlusionWeight": 0.00014333499760162623,
            "overflowReason": "none",
            "retentionBand": "back",
            "retained": true,
            "coverageWeight": 0.00019441714687238104,
            "centerPx": [
              2080.042287645351,
              1024.8105756731634
            ],
            "inverseConic": [
              0.00015402070055196016,
              -0.000015322501887454922,
              0.00018610989570900727
            ],
            "viewDepth": -0.5753166079521179,
            "opacity": 0.7372549176216125,
            "tileIndex": 14183,
            "tileX": 0,
            "tileY": 0,
            "projectedIndex": 0
          }
        ],
        "droppedContributors": [],
        "traceRecord": {
          "schemaVersion": 1,
          "anchorPixel": {
            "id": "black-band-dropout-2300-1055",
            "kind": "black-band-dropout",
            "x": 2300,
            "y": 1055,
            "description": "Horizontal band/dropout pixel with known tile address at tileSizePx=16.",
            "canonicalTileAddress": {
              "tileX": 143,
              "tileY": 65,
              "tileIndex": 14183,
              "localX": 12,
              "localY": 15
            }
          },
          "tileAddress": {
            "tileSizePx": 16,
            "tileX": 143,
            "tileY": 65,
            "tileIndex": 14183,
            "localX": 12,
            "localY": 15
          },
          "projectedContributors": [
            {
              "splatIndex": 87386,
              "originalId": 87386,
              "projectionStatus": "projected",
              "centerPx": [
                2116.802795836614,
                1020.0000211992419
              ],
              "footprintPx": {
                "majorRadiusPx": 71.351656,
                "minorRadiusPx": 61.877698,
                "areaPx": 13870.370989
              },
              "coverageWeight": 0.00021563291812395251,
              "inverseConic": [
                0.00021853002002069583,
                0.00003070445583185498,
                0.00023906783613453477
              ],
              "viewDepth": -0.5866499543190002,
              "opacity": 0.35686278343200684,
              "tileIndex": 14183,
              "tileX": 143,
              "tileY": 65,
              "projectedIndex": 2721343
            },
            {
              "splatIndex": 87369,
              "originalId": 87369,
              "projectionStatus": "projected",
              "centerPx": [
                2080.042287645351,
                1024.8105756731634
              ],
              "footprintPx": {
                "majorRadiusPx": 82.232968,
                "minorRadiusPx": 72.121645,
                "areaPx": 18632.085237
              },
              "coverageWeight": 0.00019441714687238104,
              "inverseConic": [
                0.00015402070055196016,
                -0.000015322501887454922,
                0.00018610989570900727
              ],
              "viewDepth": -0.5753166079521179,
              "opacity": 0.7372549176216125,
              "tileIndex": 14183,
              "tileX": 143,
              "tileY": 65,
              "projectedIndex": 2721344
            }
          ],
          "retainedContributors": [
            {
              "splatIndex": 87386,
              "originalId": 87386,
              "retentionStatus": "retained",
              "retentionWeight": 0.00001836837134483122,
              "occlusionWeight": 0.00007695136336127973,
              "overflowReason": "none",
              "retentionBand": "front",
              "retained": true,
              "coverageWeight": 0.00021563291812395251,
              "centerPx": [
                2116.802795836614,
                1020.0000211992419
              ],
              "inverseConic": [
                0.00021853002002069583,
                0.00003070445583185498,
                0.00023906783613453477
              ],
              "viewDepth": -0.5866499543190002,
              "opacity": 0.35686278343200684,
              "tileIndex": 14183,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            },
            {
              "splatIndex": 87369,
              "originalId": 87369,
              "retentionStatus": "retained",
              "retentionWeight": 0.000048753275508900117,
              "occlusionWeight": 0.00014333499760162623,
              "overflowReason": "none",
              "retentionBand": "back",
              "retained": true,
              "coverageWeight": 0.00019441714687238104,
              "centerPx": [
                2080.042287645351,
                1024.8105756731634
              ],
              "inverseConic": [
                0.00015402070055196016,
                -0.000015322501887454922,
                0.00018610989570900727
              ],
              "viewDepth": -0.5753166079521179,
              "opacity": 0.7372549176216125,
              "tileIndex": 14183,
              "tileX": 0,
              "tileY": 0,
              "projectedIndex": 0
            }
          ],
          "orderedContributors": [],
          "finalColorAccumulation": {
            "steps": [],
            "outputColor": [
              0,
              0,
              0,
              0
            ]
          },
          "dispatchCache": {
            "tileIndex": 14183,
            "clearFrameId": 0,
            "buildFrameId": 0,
            "compositeFrameId": 0
          },
          "rendererMetadata": {
            "requestedRenderer": "tile-local-visible",
            "effectiveRenderer": "tile-local-visible",
            "requestedArenaBackend": null,
            "effectiveArenaBackend": null,
            "viewport": {
              "width": 3456,
              "height": 1804
            },
            "tileSizePx": 16,
            "maxRefsPerTile": 256
          },
          "deferredFields": {
            "preserved": true,
            "deferredSurface": null,
            "normalSum": null,
            "albedoSum": null,
            "matSum": null,
            "weightSum": null,
            "provisionalDepth": null,
            "confidence": null,
            "lossEvidence": null
          }
        }
      }
    ],
    "perPixelFinalColorAccumulation": [
      {
        "status": "present",
        "anchorPixel": {
          "id": "black-band-dropout-2300-1055",
          "kind": "black-band-dropout",
          "x": 2300,
          "y": 1055
        },
        "tileAddress": {
          "tileSizePx": 16,
          "tileX": 143,
          "tileY": 65,
          "tileIndex": 14183,
          "localX": 12,
          "localY": 15
        },
        "finalColorAccumulation": {
          "steps": [
            {
              "splatIndex": 87386,
              "originalId": 87386,
              "orderIndex": 0,
              "coverageWeight": 0.017632972417,
              "opacity": 0.178431391716,
              "coverageAlpha": 0.00345958319,
              "transmittanceBefore": 1,
              "transmittanceAfter": 0.99654041681,
              "sourceColor": [
                0.328064262867,
                0.222050338984,
                0.140501201153
              ],
              "contributionColor": [
                0.001134965609,
                0.00076820162,
                0.000486075594
              ],
              "runningColor": [
                0.021065773945,
                0.020699009956,
                0.040347692266
              ],
              "accumulationStatus": "accumulated",
              "tileCoverageWeight": 0.000215632918,
              "viewRank": 75720,
              "viewDepth": -0.5866499543190002,
              "tileIndex": 14183
            },
            {
              "splatIndex": 87369,
              "originalId": 87369,
              "orderIndex": 1,
              "coverageWeight": 0.024069696227,
              "opacity": 0.368627458811,
              "coverageAlpha": 0.011007638723,
              "transmittanceBefore": 0.99654041681,
              "transmittanceAfter": 0.98557085993,
              "sourceColor": [
                0.40145856142,
                0.328064262867,
                0.279134780169
              ],
              "contributionColor": [
                0.004419110806,
                0.003611212883,
                0.003072614815
              ],
              "runningColor": [
                0.025253000322,
                0.024082375616,
                0.042976174261
              ],
              "accumulationStatus": "accumulated",
              "tileCoverageWeight": 0.000194417147,
              "viewRank": 79126,
              "viewDepth": -0.5753166079521179,
              "tileIndex": 14183
            }
          ],
          "outputColor": [
            0.025253000322,
            0.024082375616,
            0.042976174261,
            0.01442914007
          ],
          "clearColor": [
            0.02,
            0.02,
            0.04
          ],
          "remainingTransmittance": 0.98557085993
        },
        "blockers": []
      }
    ],
    "orderingBackend": "gpu-sorted-index-rank-inversion",
    "debugMode": "final-color",
    "visibleCompositedRefLimit": 256,
    "freshness": {
      "status": "current",
      "cachedFrameAgeMs": 0,
      "cachedFrame": 1,
      "currentFrameSignature": "tile-local@5f2a0c37",
      "cachedFrameSignature": "tile-local@5f2a0c37"
    },
    "budget": {
      "status": "current",
      "tileSizePx": 16,
      "maxRefsPerTile": 256,
      "currentViewportWidth": 3456,
      "currentViewportHeight": 1804,
      "currentTileColumns": 216,
      "currentTileRows": 113,
      "maxProjectedRefs": 20000000,
      "overflowReasons": []
    },
    "budgetDiagnostics": {
      "version": 1,
      "arenaRefs": {
        "projected": 2914339,
        "retained": 350464,
        "dropped": 2563875,
        "cappedTileCount": 1040,
        "saturatedRetainedTileCount": 1041,
        "maxProjectedRefsPerTile": 7301,
        "maxRetainedRefsPerTile": 256
      },
      "overflowReasons": [
        {
          "reason": "per-tile-ref-cap",
          "projectedRefs": 2914339,
          "retainedRefs": 350464,
          "droppedRefs": 2563875,
          "cappedTileCount": 1040,
          "maxRefsPerTile": 256
        }
      ],
      "capPressure": {
        "version": 1,
        "classification": "over-cap",
        "refs": {
          "projected": 2914339,
          "retained": 350464,
          "dropped": 2563875,
          "maxRefsPerTile": 256,
          "tileCount": 24408
        },
        "retainedBands": {
          "front": {
            "total": 113108,
            "coverageHigh": 9104,
            "coverageMedium": 21406,
            "coverageLow": 82598
          },
          "middle": {
            "total": 191354,
            "coverageHigh": 6888,
            "coverageMedium": 23823,
            "coverageLow": 160643
          },
          "back": {
            "total": 46002,
            "coverageHigh": 911,
            "coverageMedium": 4713,
            "coverageLow": 40378
          }
        },
        "droppedBands": {
          "front": {
            "total": 741458,
            "coverageHigh": 399,
            "coverageMedium": 4050,
            "coverageLow": 737009
          },
          "middle": {
            "total": 1277005,
            "coverageHigh": 269,
            "coverageMedium": 6216,
            "coverageLow": 1270520
          },
          "back": {
            "total": 545412,
            "coverageHigh": 14,
            "coverageMedium": 761,
            "coverageLow": 544637
          }
        },
        "overflowReasons": {
          "none": 350464,
          "perTileRetainedCap": 0,
          "perTileRetainedCapPolicyReserve": 27935,
          "perTileRetainedCapForegroundBand": 732032,
          "perTileRetainedCapMiddleBand": 1263643,
          "perTileRetainedCapBehindSurfaceBand": 540265
        },
        "lossSignals": {
          "foregroundDroppedRefs": 741458,
          "behindSurfaceDroppedRefs": 545412,
          "policyReserveDisplacedRefs": 27935,
          "highCoverageDroppedRefs": 682,
          "highRetentionDroppedRefs": 200,
          "highOcclusionDroppedRefs": 225
        },
        "policyHooks": [
          {
            "kind": "tile-local-lod",
            "reason": "compress dense same-tile contributors before the retained-ref cap rather than raising it",
            "raisesCap": false
          },
          {
            "kind": "tile-local-aggregation",
            "reason": "aggregate low-priority dropped contributors into explicit evidence instead of hiding loss",
            "raisesCap": false
          }
        ]
      },
      "retainedBands": {
        "front": {
          "total": 113108,
          "coverageHigh": 9104,
          "coverageMedium": 21406,
          "coverageLow": 82598
        },
        "middle": {
          "total": 191354,
          "coverageHigh": 6888,
          "coverageMedium": 23823,
          "coverageLow": 160643
        },
        "back": {
          "total": 46002,
          "coverageHigh": 911,
          "coverageMedium": 4713,
          "coverageLow": 40378
        }
      },
      "droppedBands": {
        "front": {
          "total": 741458,
          "coverageHigh": 399,
          "coverageMedium": 4050,
          "coverageLow": 737009
        },
        "middle": {
          "total": 1277005,
          "coverageHigh": 269,
          "coverageMedium": 6216,
          "coverageLow": 1270520
        },
        "back": {
          "total": 545412,
          "coverageHigh": 14,
          "coverageMedium": 761,
          "coverageLow": 544637
        }
      },
      "heat": {
        "cpu": {
          "projectedRefs": 2914339,
          "projectedRefsPerTile": 119.400975,
          "projectedToRetainedRatio": 8.315659,
          "buildDurationMs": 26167.7
        },
        "gpu": {
          "retainedRefs": 350464,
          "retainedRefBufferBytes": 5607424,
          "coverageWeightBufferBytes": 1401856,
          "alphaParamBufferBytes": 11214848,
          "orderingKeyBufferBytes": 1401856
        }
      }
    },
    "diagnostics": {
      "version": 1,
      "debugMode": "final-color",
      "tileGrid": {
        "columns": 216,
        "rows": 113,
        "tileSizePx": 16
      },
      "tileRefs": {
        "total": 350464,
        "nonEmptyTiles": 3329,
        "maxPerTile": 256,
        "averagePerNonEmptyTile": 105.276059,
        "density": 0.13639
      },
      "tileRefCustody": {
        "projectedTileEntryCount": 2914339,
        "retainedTileEntryCount": 350464,
        "evictedTileEntryCount": 2563875,
        "cappedTileCount": 1040,
        "saturatedRetainedTileCount": 1041,
        "maxProjectedRefsPerTile": 7301,
        "maxRetainedRefsPerTile": 256,
        "headerRefCount": 350464,
        "headerAccountingMatches": true
      },
      "retentionAudit": {
        "fullFrame": {
          "region": "full-frame",
          "tileCount": 3329,
          "cappedTileCount": 1040,
          "projectedTileEntryCount": 2914339,
          "currentRetainedEntryCount": 350464,
          "legacyRetainedEntryCount": 350464,
          "addedByPolicyCount": 27935,
          "droppedByPolicyCount": 27935,
          "addedRetentionWeightSum": 1300.904854,
          "droppedRetentionWeightSum": 1007.896118,
          "addedOcclusionWeightSum": 1696.44378,
          "droppedOcclusionWeightSum": 2232.268294,
          "addedByPolicySamples": [
            {
              "tileIndex": 9606,
              "tileX": 102,
              "tileY": 44,
              "splatIndex": 59051,
              "originalId": 59051,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.843137,
              "viewRank": 55488
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 12701,
              "originalId": 12701,
              "coverageWeight": 0.00001,
              "retentionWeight": 0.000005,
              "occlusionWeight": 0.000009,
              "occlusionDensity": 0.835294,
              "viewRank": 50130
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 1582,
              "originalId": 1582,
              "coverageWeight": 0.000009,
              "retentionWeight": 0.000004,
              "occlusionWeight": 0.000007,
              "occlusionDensity": 0.768627,
              "viewRank": 43898
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 16318,
              "originalId": 16318,
              "coverageWeight": 0.000031,
              "retentionWeight": 0.000013,
              "occlusionWeight": 0.000029,
              "occlusionDensity": 0.945098,
              "viewRank": 78508
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 18321,
              "originalId": 18321,
              "coverageWeight": 0.000024,
              "retentionWeight": 0.000014,
              "occlusionWeight": 0.000022,
              "occlusionDensity": 0.898039,
              "viewRank": 53247
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 5515,
              "originalId": 5515,
              "coverageWeight": 0.000045,
              "retentionWeight": 0.000023,
              "occlusionWeight": 0.000039,
              "occlusionDensity": 0.854902,
              "viewRank": 51386
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 12701,
              "originalId": 12701,
              "coverageWeight": 0.000044,
              "retentionWeight": 0.000021,
              "occlusionWeight": 0.000036,
              "occlusionDensity": 0.835294,
              "viewRank": 50130
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 28733,
              "originalId": 28733,
              "coverageWeight": 0.000043,
              "retentionWeight": 0.000022,
              "occlusionWeight": 0.000033,
              "occlusionDensity": 0.756863,
              "viewRank": 74095
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 28584,
              "originalId": 28584,
              "coverageWeight": 0.000057,
              "retentionWeight": 0.000032,
              "occlusionWeight": 0.000048,
              "occlusionDensity": 0.843137,
              "viewRank": 72448
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 62985,
              "originalId": 62985,
              "coverageWeight": 0.000056,
              "retentionWeight": 0.000024,
              "occlusionWeight": 0.00004,
              "occlusionDensity": 0.705882,
              "viewRank": 52328
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 10714,
              "originalId": 10714,
              "coverageWeight": 0.000047,
              "retentionWeight": 0.000021,
              "occlusionWeight": 0.000045,
              "occlusionDensity": 0.964706,
              "viewRank": 66561
            },
            {
              "tileIndex": 9611,
              "tileX": 107,
              "tileY": 44,
              "splatIndex": 80810,
              "originalId": 80810,
              "coverageWeight": 0.000059,
              "retentionWeight": 0.000028,
              "occlusionWeight": 0.000048,
              "occlusionDensity": 0.815686,
              "viewRank": 68274
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 9606,
              "tileX": 102,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000003,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 6393,
              "originalId": 6393,
              "coverageWeight": 0.000013,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.270588,
              "viewRank": 75319
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 7553,
              "originalId": 7553,
              "coverageWeight": 0.000011,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000006,
              "occlusionDensity": 0.521569,
              "viewRank": 58916
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 7443,
              "originalId": 7443,
              "coverageWeight": 0.000084,
              "retentionWeight": 0.000005,
              "occlusionWeight": 0.000013,
              "occlusionDensity": 0.152941,
              "viewRank": 66562
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 6393,
              "originalId": 6393,
              "coverageWeight": 0.000043,
              "retentionWeight": 0.000004,
              "occlusionWeight": 0.000012,
              "occlusionDensity": 0.270588,
              "viewRank": 75319
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 7443,
              "originalId": 7443,
              "coverageWeight": 0.000162,
              "retentionWeight": 0.00001,
              "occlusionWeight": 0.000025,
              "occlusionDensity": 0.152941,
              "viewRank": 66562
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 8038,
              "originalId": 8038,
              "coverageWeight": 0.00006,
              "retentionWeight": 0.000009,
              "occlusionWeight": 0.000027,
              "occlusionDensity": 0.443137,
              "viewRank": 70385
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000059,
              "retentionWeight": 0.000003,
              "occlusionWeight": 0.000008,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000114,
              "retentionWeight": 0.000005,
              "occlusionWeight": 0.000015,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 6623,
              "originalId": 6623,
              "coverageWeight": 0.00008,
              "retentionWeight": 0.000008,
              "occlusionWeight": 0.000036,
              "occlusionDensity": 0.454902,
              "viewRank": 64532
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 17044,
              "originalId": 17044,
              "coverageWeight": 0.000064,
              "retentionWeight": 0.000009,
              "occlusionWeight": 0.000029,
              "occlusionDensity": 0.45098,
              "viewRank": 68100
            },
            {
              "tileIndex": 9611,
              "tileX": 107,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000186,
              "retentionWeight": 0.000009,
              "occlusionWeight": 0.000024,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            }
          ]
        },
        "regions": {
          "porousBody": {
            "region": "porous-body",
            "tileCount": 860,
            "cappedTileCount": 471,
            "projectedTileEntryCount": 1366632,
            "currentRetainedEntryCount": 149978,
            "legacyRetainedEntryCount": 149978,
            "addedByPolicyCount": 8480,
            "droppedByPolicyCount": 8480,
            "addedRetentionWeightSum": 385.002936,
            "droppedRetentionWeightSum": 208.195603,
            "addedOcclusionWeightSum": 583.453181,
            "droppedOcclusionWeightSum": 494.594363,
            "addedByPolicySamples": [
              {
                "tileIndex": 9606,
                "tileX": 102,
                "tileY": 44,
                "splatIndex": 59051,
                "originalId": 59051,
                "coverageWeight": 0.000002,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000001,
                "occlusionDensity": 0.843137,
                "viewRank": 55488
              },
              {
                "tileIndex": 9607,
                "tileX": 103,
                "tileY": 44,
                "splatIndex": 12701,
                "originalId": 12701,
                "coverageWeight": 0.00001,
                "retentionWeight": 0.000005,
                "occlusionWeight": 0.000009,
                "occlusionDensity": 0.835294,
                "viewRank": 50130
              },
              {
                "tileIndex": 9607,
                "tileX": 103,
                "tileY": 44,
                "splatIndex": 1582,
                "originalId": 1582,
                "coverageWeight": 0.000009,
                "retentionWeight": 0.000004,
                "occlusionWeight": 0.000007,
                "occlusionDensity": 0.768627,
                "viewRank": 43898
              },
              {
                "tileIndex": 9608,
                "tileX": 104,
                "tileY": 44,
                "splatIndex": 16318,
                "originalId": 16318,
                "coverageWeight": 0.000031,
                "retentionWeight": 0.000013,
                "occlusionWeight": 0.000029,
                "occlusionDensity": 0.945098,
                "viewRank": 78508
              },
              {
                "tileIndex": 9608,
                "tileX": 104,
                "tileY": 44,
                "splatIndex": 18321,
                "originalId": 18321,
                "coverageWeight": 0.000024,
                "retentionWeight": 0.000014,
                "occlusionWeight": 0.000022,
                "occlusionDensity": 0.898039,
                "viewRank": 53247
              },
              {
                "tileIndex": 9609,
                "tileX": 105,
                "tileY": 44,
                "splatIndex": 5515,
                "originalId": 5515,
                "coverageWeight": 0.000045,
                "retentionWeight": 0.000023,
                "occlusionWeight": 0.000039,
                "occlusionDensity": 0.854902,
                "viewRank": 51386
              },
              {
                "tileIndex": 9609,
                "tileX": 105,
                "tileY": 44,
                "splatIndex": 12701,
                "originalId": 12701,
                "coverageWeight": 0.000044,
                "retentionWeight": 0.000021,
                "occlusionWeight": 0.000036,
                "occlusionDensity": 0.835294,
                "viewRank": 50130
              },
              {
                "tileIndex": 9609,
                "tileX": 105,
                "tileY": 44,
                "splatIndex": 28733,
                "originalId": 28733,
                "coverageWeight": 0.000043,
                "retentionWeight": 0.000022,
                "occlusionWeight": 0.000033,
                "occlusionDensity": 0.756863,
                "viewRank": 74095
              },
              {
                "tileIndex": 9610,
                "tileX": 106,
                "tileY": 44,
                "splatIndex": 28584,
                "originalId": 28584,
                "coverageWeight": 0.000057,
                "retentionWeight": 0.000032,
                "occlusionWeight": 0.000048,
                "occlusionDensity": 0.843137,
                "viewRank": 72448
              },
              {
                "tileIndex": 9610,
                "tileX": 106,
                "tileY": 44,
                "splatIndex": 62985,
                "originalId": 62985,
                "coverageWeight": 0.000056,
                "retentionWeight": 0.000024,
                "occlusionWeight": 0.00004,
                "occlusionDensity": 0.705882,
                "viewRank": 52328
              },
              {
                "tileIndex": 9610,
                "tileX": 106,
                "tileY": 44,
                "splatIndex": 10714,
                "originalId": 10714,
                "coverageWeight": 0.000047,
                "retentionWeight": 0.000021,
                "occlusionWeight": 0.000045,
                "occlusionDensity": 0.964706,
                "viewRank": 66561
              },
              {
                "tileIndex": 9611,
                "tileX": 107,
                "tileY": 44,
                "splatIndex": 80810,
                "originalId": 80810,
                "coverageWeight": 0.000059,
                "retentionWeight": 0.000028,
                "occlusionWeight": 0.000048,
                "occlusionDensity": 0.815686,
                "viewRank": 68274
              }
            ],
            "droppedByPolicySamples": [
              {
                "tileIndex": 9606,
                "tileX": 102,
                "tileY": 44,
                "splatIndex": 7442,
                "originalId": 7442,
                "coverageWeight": 0.000003,
                "retentionWeight": 0,
                "occlusionWeight": 0,
                "occlusionDensity": 0.129412,
                "viewRank": 63516
              },
              {
                "tileIndex": 9607,
                "tileX": 103,
                "tileY": 44,
                "splatIndex": 6393,
                "originalId": 6393,
                "coverageWeight": 0.000013,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000003,
                "occlusionDensity": 0.270588,
                "viewRank": 75319
              },
              {
                "tileIndex": 9607,
                "tileX": 103,
                "tileY": 44,
                "splatIndex": 7553,
                "originalId": 7553,
                "coverageWeight": 0.000011,
                "retentionWeight": 0.000001,
                "occlusionWeight": 0.000006,
                "occlusionDensity": 0.521569,
                "viewRank": 58916
              },
              {
                "tileIndex": 9608,
                "tileX": 104,
                "tileY": 44,
                "splatIndex": 7443,
                "originalId": 7443,
                "coverageWeight": 0.000084,
                "retentionWeight": 0.000005,
                "occlusionWeight": 0.000013,
                "occlusionDensity": 0.152941,
                "viewRank": 66562
              },
              {
                "tileIndex": 9608,
                "tileX": 104,
                "tileY": 44,
                "splatIndex": 6393,
                "originalId": 6393,
                "coverageWeight": 0.000043,
                "retentionWeight": 0.000004,
                "occlusionWeight": 0.000012,
                "occlusionDensity": 0.270588,
                "viewRank": 75319
              },
              {
                "tileIndex": 9609,
                "tileX": 105,
                "tileY": 44,
                "splatIndex": 7443,
                "originalId": 7443,
                "coverageWeight": 0.000162,
                "retentionWeight": 0.00001,
                "occlusionWeight": 0.000025,
                "occlusionDensity": 0.152941,
                "viewRank": 66562
              },
              {
                "tileIndex": 9609,
                "tileX": 105,
                "tileY": 44,
                "splatIndex": 8038,
                "originalId": 8038,
                "coverageWeight": 0.00006,
                "retentionWeight": 0.000009,
                "occlusionWeight": 0.000027,
                "occlusionDensity": 0.443137,
                "viewRank": 70385
              },
              {
                "tileIndex": 9609,
                "tileX": 105,
                "tileY": 44,
                "splatIndex": 7442,
                "originalId": 7442,
                "coverageWeight": 0.000059,
                "retentionWeight": 0.000003,
                "occlusionWeight": 0.000008,
                "occlusionDensity": 0.129412,
                "viewRank": 63516
              },
              {
                "tileIndex": 9610,
                "tileX": 106,
                "tileY": 44,
                "splatIndex": 7442,
                "originalId": 7442,
                "coverageWeight": 0.000114,
                "retentionWeight": 0.000005,
                "occlusionWeight": 0.000015,
                "occlusionDensity": 0.129412,
                "viewRank": 63516
              },
              {
                "tileIndex": 9610,
                "tileX": 106,
                "tileY": 44,
                "splatIndex": 6623,
                "originalId": 6623,
                "coverageWeight": 0.00008,
                "retentionWeight": 0.000008,
                "occlusionWeight": 0.000036,
                "occlusionDensity": 0.454902,
                "viewRank": 64532
              },
              {
                "tileIndex": 9610,
                "tileX": 106,
                "tileY": 44,
                "splatIndex": 17044,
                "originalId": 17044,
                "coverageWeight": 0.000064,
                "retentionWeight": 0.000009,
                "occlusionWeight": 0.000029,
                "occlusionDensity": 0.45098,
                "viewRank": 68100
              },
              {
                "tileIndex": 9611,
                "tileX": 107,
                "tileY": 44,
                "splatIndex": 7442,
                "originalId": 7442,
                "coverageWeight": 0.000186,
                "retentionWeight": 0.000009,
                "occlusionWeight": 0.000024,
                "occlusionDensity": 0.129412,
                "viewRank": 63516
              }
            ]
          },
          "centerLeakBand": {
            "region": "center-leak-band",
            "tileCount": 1501,
            "cappedTileCount": 898,
            "projectedTileEntryCount": 2788200,
            "currentRetainedEntryCount": 259648,
            "legacyRetainedEntryCount": 259648,
            "addedByPolicyCount": 26315,
            "droppedByPolicyCount": 26315,
            "addedRetentionWeightSum": 1300.389861,
            "droppedRetentionWeightSum": 1007.761581,
            "addedOcclusionWeightSum": 1695.687167,
            "droppedOcclusionWeightSum": 2231.51662,
            "addedByPolicySamples": [
              {
                "tileIndex": 10250,
                "tileX": 98,
                "tileY": 47,
                "splatIndex": 12702,
                "originalId": 12702,
                "coverageWeight": 0.000145,
                "retentionWeight": 0.000073,
                "occlusionWeight": 0.000131,
                "occlusionDensity": 0.898039,
                "viewRank": 57473
              },
              {
                "tileIndex": 10250,
                "tileX": 98,
                "tileY": 47,
                "splatIndex": 14181,
                "originalId": 14181,
                "coverageWeight": 0.000139,
                "retentionWeight": 0.000065,
                "occlusionWeight": 0.000116,
                "occlusionDensity": 0.835294,
                "viewRank": 55269
              },
              {
                "tileIndex": 10250,
                "tileX": 98,
                "tileY": 47,
                "splatIndex": 82844,
                "originalId": 82844,
                "coverageWeight": 0.00013,
                "retentionWeight": 0.000066,
                "occlusionWeight": 0.000115,
                "occlusionDensity": 0.878431,
                "viewRank": 62725
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 61226,
                "originalId": 61226,
                "coverageWeight": 0.000529,
                "retentionWeight": 0.000275,
                "occlusionWeight": 0.000492,
                "occlusionDensity": 0.929412,
                "viewRank": 76939
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 83071,
                "originalId": 83071,
                "coverageWeight": 0.000513,
                "retentionWeight": 0.000241,
                "occlusionWeight": 0.00044,
                "occlusionDensity": 0.858824,
                "viewRank": 65664
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 35826,
                "originalId": 35826,
                "coverageWeight": 0.000498,
                "retentionWeight": 0.000289,
                "occlusionWeight": 0.000444,
                "occlusionDensity": 0.890196,
                "viewRank": 73710
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 15280,
                "originalId": 15280,
                "coverageWeight": 0.000465,
                "retentionWeight": 0.000231,
                "occlusionWeight": 0.000374,
                "occlusionDensity": 0.803922,
                "viewRank": 72968
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 28416,
                "originalId": 28416,
                "coverageWeight": 0.000457,
                "retentionWeight": 0.00023,
                "occlusionWeight": 0.000339,
                "occlusionDensity": 0.741176,
                "viewRank": 61678
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 79457,
                "originalId": 79457,
                "coverageWeight": 0.00195,
                "retentionWeight": 0.000866,
                "occlusionWeight": 0.001476,
                "occlusionDensity": 0.756863,
                "viewRank": 74367
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 41837,
                "originalId": 41837,
                "coverageWeight": 0.001894,
                "retentionWeight": 0.000888,
                "occlusionWeight": 0.001315,
                "occlusionDensity": 0.694118,
                "viewRank": 79924
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 28416,
                "originalId": 28416,
                "coverageWeight": 0.001644,
                "retentionWeight": 0.000827,
                "occlusionWeight": 0.001218,
                "occlusionDensity": 0.741176,
                "viewRank": 61678
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 61226,
                "originalId": 61226,
                "coverageWeight": 0.001546,
                "retentionWeight": 0.000805,
                "occlusionWeight": 0.001437,
                "occlusionDensity": 0.929412,
                "viewRank": 76939
              }
            ],
            "droppedByPolicySamples": [
              {
                "tileIndex": 10250,
                "tileX": 98,
                "tileY": 47,
                "splatIndex": 41579,
                "originalId": 41579,
                "coverageWeight": 0.000329,
                "retentionWeight": 0.000031,
                "occlusionWeight": 0.000058,
                "occlusionDensity": 0.176471,
                "viewRank": 79352
              },
              {
                "tileIndex": 10250,
                "tileX": 98,
                "tileY": 47,
                "splatIndex": 61313,
                "originalId": 61313,
                "coverageWeight": 0.00031,
                "retentionWeight": 0.000016,
                "occlusionWeight": 0.000058,
                "occlusionDensity": 0.188235,
                "viewRank": 90574
              },
              {
                "tileIndex": 10250,
                "tileX": 98,
                "tileY": 47,
                "splatIndex": 85412,
                "originalId": 85412,
                "coverageWeight": 0.000182,
                "retentionWeight": 0.000018,
                "occlusionWeight": 0.000045,
                "occlusionDensity": 0.247059,
                "viewRank": 64220
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 45096,
                "originalId": 45096,
                "coverageWeight": 0.00072,
                "retentionWeight": 0.000061,
                "occlusionWeight": 0.000164,
                "occlusionDensity": 0.227451,
                "viewRank": 80454
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 40564,
                "originalId": 40564,
                "coverageWeight": 0.000718,
                "retentionWeight": 0.000093,
                "occlusionWeight": 0.000169,
                "occlusionDensity": 0.235294,
                "viewRank": 79307
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 41506,
                "originalId": 41506,
                "coverageWeight": 0.000661,
                "retentionWeight": 0.00009,
                "occlusionWeight": 0.000244,
                "occlusionDensity": 0.368627,
                "viewRank": 79238
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 78425,
                "originalId": 78425,
                "coverageWeight": 0.000617,
                "retentionWeight": 0.000051,
                "occlusionWeight": 0.000097,
                "occlusionDensity": 0.156863,
                "viewRank": 69314
              },
              {
                "tileIndex": 10251,
                "tileX": 99,
                "tileY": 47,
                "splatIndex": 12246,
                "originalId": 12246,
                "coverageWeight": 0.000615,
                "retentionWeight": 0.000104,
                "occlusionWeight": 0.000145,
                "occlusionDensity": 0.235294,
                "viewRank": 72124
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 62736,
                "originalId": 62736,
                "coverageWeight": 0.003943,
                "retentionWeight": 0.00038,
                "occlusionWeight": 0.001067,
                "occlusionDensity": 0.270588,
                "viewRank": 81068
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 78003,
                "originalId": 78003,
                "coverageWeight": 0.003654,
                "retentionWeight": 0.000347,
                "occlusionWeight": 0.000903,
                "occlusionDensity": 0.247059,
                "viewRank": 75946
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 6303,
                "originalId": 6303,
                "coverageWeight": 0.002111,
                "retentionWeight": 0.000358,
                "occlusionWeight": 0.001026,
                "occlusionDensity": 0.486274,
                "viewRank": 81205
              },
              {
                "tileIndex": 10252,
                "tileX": 100,
                "tileY": 47,
                "splatIndex": 34286,
                "originalId": 34286,
                "coverageWeight": 0.002103,
                "retentionWeight": 0.000316,
                "occlusionWeight": 0.000817,
                "occlusionDensity": 0.388235,
                "viewRank": 79677
              }
            ]
          }
        }
      },
      "coverageWeight": {
        "min": 0,
        "max": 9.93111,
        "mean": 0.16795
      },
      "alpha": {
        "maxSourceOpacity": 1,
        "meanSourceOpacity": 0.322393,
        "estimatedMaxAccumulatedAlpha": 1,
        "estimatedMinTransmittance": 0,
        "alphaParamRefs": 350464
      },
      "conicShape": {
        "maxMajorRadiusPx": 143.340055,
        "minMinorRadiusPx": 1.5,
        "maxAnisotropyRatio": 53.327135
      }
    },
    "pixelContributorTrace": {
      "schemaVersion": 1,
      "anchorPixel": {
        "id": "black-band-dropout-2300-1055",
        "kind": "black-band-dropout",
        "x": 2300,
        "y": 1055
      },
      "tileAddress": {
        "tileSizePx": 16,
        "tileX": 143,
        "tileY": 65,
        "tileIndex": 14183,
        "localX": 12,
        "localY": 15
      },
      "projectedContributors": [
        {
          "splatIndex": 87386,
          "originalId": 87386,
          "projectionStatus": "projected",
          "centerPx": [
            2116.802795836614,
            1020.0000211992419
          ],
          "footprintPx": {
            "majorRadiusPx": 71.351656,
            "minorRadiusPx": 61.877698,
            "areaPx": 13870.370989
          },
          "coverageWeight": 0.00021563291812395251,
          "inverseConic": [
            0.00021853002002069583,
            0.00003070445583185498,
            0.00023906783613453477
          ],
          "viewDepth": -0.5866499543190002,
          "opacity": 0.35686278343200684,
          "tileIndex": 14183,
          "tileX": 143,
          "tileY": 65,
          "projectedIndex": 2721343
        },
        {
          "splatIndex": 87369,
          "originalId": 87369,
          "projectionStatus": "projected",
          "centerPx": [
            2080.042287645351,
            1024.8105756731634
          ],
          "footprintPx": {
            "majorRadiusPx": 82.232968,
            "minorRadiusPx": 72.121645,
            "areaPx": 18632.085237
          },
          "coverageWeight": 0.00019441714687238104,
          "inverseConic": [
            0.00015402070055196016,
            -0.000015322501887454922,
            0.00018610989570900727
          ],
          "viewDepth": -0.5753166079521179,
          "opacity": 0.7372549176216125,
          "tileIndex": 14183,
          "tileX": 143,
          "tileY": 65,
          "projectedIndex": 2721344
        }
      ],
      "retainedContributors": [
        {
          "splatIndex": 87386,
          "originalId": 87386,
          "retentionStatus": "retained",
          "retentionWeight": 0.00001836837134483122,
          "occlusionWeight": 0.00007695136336127973,
          "overflowReason": "none",
          "retentionBand": "front",
          "retained": true,
          "coverageWeight": 0.00021563291812395251,
          "centerPx": [
            2116.802795836614,
            1020.0000211992419
          ],
          "inverseConic": [
            0.00021853002002069583,
            0.00003070445583185498,
            0.00023906783613453477
          ],
          "viewDepth": -0.5866499543190002,
          "opacity": 0.35686278343200684,
          "tileIndex": 14183,
          "tileX": 0,
          "tileY": 0,
          "projectedIndex": 0
        },
        {
          "splatIndex": 87369,
          "originalId": 87369,
          "retentionStatus": "retained",
          "retentionWeight": 0.000048753275508900117,
          "occlusionWeight": 0.00014333499760162623,
          "overflowReason": "none",
          "retentionBand": "back",
          "retained": true,
          "coverageWeight": 0.00019441714687238104,
          "centerPx": [
            2080.042287645351,
            1024.8105756731634
          ],
          "inverseConic": [
            0.00015402070055196016,
            -0.000015322501887454922,
            0.00018610989570900727
          ],
          "viewDepth": -0.5753166079521179,
          "opacity": 0.7372549176216125,
          "tileIndex": 14183,
          "tileX": 0,
          "tileY": 0,
          "projectedIndex": 0
        }
      ],
      "orderedContributors": [
        {
          "splatIndex": 87386,
          "originalId": 87386,
          "orderIndex": 0,
          "viewRank": 75720,
          "viewDepth": -0.5866499543190002,
          "tieBreakKey": "rank:75720|depth:-0.5866499543190002|original:87386|splat:87386",
          "orderBackend": "gpu-sorted-index-rank-inversion"
        },
        {
          "splatIndex": 87369,
          "originalId": 87369,
          "orderIndex": 1,
          "viewRank": 79126,
          "viewDepth": -0.5753166079521179,
          "tieBreakKey": "rank:79126|depth:-0.5753166079521179|original:87369|splat:87369",
          "orderBackend": "gpu-sorted-index-rank-inversion"
        }
      ],
      "finalColorAccumulation": {
        "steps": [
          {
            "splatIndex": 87386,
            "originalId": 87386,
            "orderIndex": 0,
            "coverageWeight": 0.017632972417,
            "opacity": 0.178431391716,
            "coverageAlpha": 0.00345958319,
            "transmittanceBefore": 1,
            "transmittanceAfter": 0.99654041681,
            "sourceColor": [
              0.328064262867,
              0.222050338984,
              0.140501201153
            ],
            "contributionColor": [
              0.001134965609,
              0.00076820162,
              0.000486075594
            ],
            "runningColor": [
              0.021065773945,
              0.020699009956,
              0.040347692266
            ],
            "accumulationStatus": "accumulated",
            "tileCoverageWeight": 0.000215632918,
            "viewRank": 75720,
            "viewDepth": -0.5866499543190002,
            "tileIndex": 14183
          },
          {
            "splatIndex": 87369,
            "originalId": 87369,
            "orderIndex": 1,
            "coverageWeight": 0.024069696227,
            "opacity": 0.368627458811,
            "coverageAlpha": 0.011007638723,
            "transmittanceBefore": 0.99654041681,
            "transmittanceAfter": 0.98557085993,
            "sourceColor": [
              0.40145856142,
              0.328064262867,
              0.279134780169
            ],
            "contributionColor": [
              0.004419110806,
              0.003611212883,
              0.003072614815
            ],
            "runningColor": [
              0.025253000322,
              0.024082375616,
              0.042976174261
            ],
            "accumulationStatus": "accumulated",
            "tileCoverageWeight": 0.000194417147,
            "viewRank": 79126,
            "viewDepth": -0.5753166079521179,
            "tileIndex": 14183
          }
        ],
        "outputColor": [
          0.025253000322,
          0.024082375616,
          0.042976174261,
          0.01442914007
        ],
        "clearColor": [
          0.02,
          0.02,
          0.04
        ],
        "remainingTransmittance": 0.98557085993
      },
      "dispatchCache": {
        "tileIndex": 14183,
        "clearFrameId": 1,
        "buildFrameId": 1,
        "compositeFrameId": 1,
        "tileY": 65,
        "tileSpan": {
          "minTileX": 139,
          "maxTileX": 149,
          "minTileY": 64,
          "maxTileY": 66
        },
        "cacheState": "current",
        "presentationFrameId": 1,
        "rowDispatchState": {
          "tileCoveredByClear": true,
          "tileCoveredByBuild": true,
          "tileCoveredByComposite": true,
          "rowCoveredByComposite": true,
          "currentFrameComplete": true
        }
      },
      "rendererMetadata": {
        "requestedRenderer": "tile-local-visible",
        "effectiveRenderer": "tile-local-visible-gaussian-compositor",
        "requestedArenaBackend": "gpu",
        "effectiveArenaBackend": "gpu",
        "tileSizePx": 16,
        "maxRefsPerTile": 256,
        "viewport": {
          "width": 3456,
          "height": 1804
        }
      },
      "deferredFields": {
        "preserved": true,
        "deferredSurface": null,
        "missingReason": "production deferred G-buffer voting is outside the trace packet scope"
      },
      "blockers": []
    }
  },
  "tileLocalDiagnostics": {
    "version": 1,
    "debugMode": "final-color",
    "tileGrid": {
      "columns": 216,
      "rows": 113,
      "tileSizePx": 16
    },
    "tileRefs": {
      "total": 350464,
      "nonEmptyTiles": 3329,
      "maxPerTile": 256,
      "averagePerNonEmptyTile": 105.276059,
      "density": 0.13639
    },
    "tileRefCustody": {
      "projectedTileEntryCount": 2914339,
      "retainedTileEntryCount": 350464,
      "evictedTileEntryCount": 2563875,
      "cappedTileCount": 1040,
      "saturatedRetainedTileCount": 1041,
      "maxProjectedRefsPerTile": 7301,
      "maxRetainedRefsPerTile": 256,
      "headerRefCount": 350464,
      "headerAccountingMatches": true
    },
    "retentionAudit": {
      "fullFrame": {
        "region": "full-frame",
        "tileCount": 3329,
        "cappedTileCount": 1040,
        "projectedTileEntryCount": 2914339,
        "currentRetainedEntryCount": 350464,
        "legacyRetainedEntryCount": 350464,
        "addedByPolicyCount": 27935,
        "droppedByPolicyCount": 27935,
        "addedRetentionWeightSum": 1300.904854,
        "droppedRetentionWeightSum": 1007.896118,
        "addedOcclusionWeightSum": 1696.44378,
        "droppedOcclusionWeightSum": 2232.268294,
        "addedByPolicySamples": [
          {
            "tileIndex": 9606,
            "tileX": 102,
            "tileY": 44,
            "splatIndex": 59051,
            "originalId": 59051,
            "coverageWeight": 0.000002,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000001,
            "occlusionDensity": 0.843137,
            "viewRank": 55488
          },
          {
            "tileIndex": 9607,
            "tileX": 103,
            "tileY": 44,
            "splatIndex": 12701,
            "originalId": 12701,
            "coverageWeight": 0.00001,
            "retentionWeight": 0.000005,
            "occlusionWeight": 0.000009,
            "occlusionDensity": 0.835294,
            "viewRank": 50130
          },
          {
            "tileIndex": 9607,
            "tileX": 103,
            "tileY": 44,
            "splatIndex": 1582,
            "originalId": 1582,
            "coverageWeight": 0.000009,
            "retentionWeight": 0.000004,
            "occlusionWeight": 0.000007,
            "occlusionDensity": 0.768627,
            "viewRank": 43898
          },
          {
            "tileIndex": 9608,
            "tileX": 104,
            "tileY": 44,
            "splatIndex": 16318,
            "originalId": 16318,
            "coverageWeight": 0.000031,
            "retentionWeight": 0.000013,
            "occlusionWeight": 0.000029,
            "occlusionDensity": 0.945098,
            "viewRank": 78508
          },
          {
            "tileIndex": 9608,
            "tileX": 104,
            "tileY": 44,
            "splatIndex": 18321,
            "originalId": 18321,
            "coverageWeight": 0.000024,
            "retentionWeight": 0.000014,
            "occlusionWeight": 0.000022,
            "occlusionDensity": 0.898039,
            "viewRank": 53247
          },
          {
            "tileIndex": 9609,
            "tileX": 105,
            "tileY": 44,
            "splatIndex": 5515,
            "originalId": 5515,
            "coverageWeight": 0.000045,
            "retentionWeight": 0.000023,
            "occlusionWeight": 0.000039,
            "occlusionDensity": 0.854902,
            "viewRank": 51386
          },
          {
            "tileIndex": 9609,
            "tileX": 105,
            "tileY": 44,
            "splatIndex": 12701,
            "originalId": 12701,
            "coverageWeight": 0.000044,
            "retentionWeight": 0.000021,
            "occlusionWeight": 0.000036,
            "occlusionDensity": 0.835294,
            "viewRank": 50130
          },
          {
            "tileIndex": 9609,
            "tileX": 105,
            "tileY": 44,
            "splatIndex": 28733,
            "originalId": 28733,
            "coverageWeight": 0.000043,
            "retentionWeight": 0.000022,
            "occlusionWeight": 0.000033,
            "occlusionDensity": 0.756863,
            "viewRank": 74095
          },
          {
            "tileIndex": 9610,
            "tileX": 106,
            "tileY": 44,
            "splatIndex": 28584,
            "originalId": 28584,
            "coverageWeight": 0.000057,
            "retentionWeight": 0.000032,
            "occlusionWeight": 0.000048,
            "occlusionDensity": 0.843137,
            "viewRank": 72448
          },
          {
            "tileIndex": 9610,
            "tileX": 106,
            "tileY": 44,
            "splatIndex": 62985,
            "originalId": 62985,
            "coverageWeight": 0.000056,
            "retentionWeight": 0.000024,
            "occlusionWeight": 0.00004,
            "occlusionDensity": 0.705882,
            "viewRank": 52328
          },
          {
            "tileIndex": 9610,
            "tileX": 106,
            "tileY": 44,
            "splatIndex": 10714,
            "originalId": 10714,
            "coverageWeight": 0.000047,
            "retentionWeight": 0.000021,
            "occlusionWeight": 0.000045,
            "occlusionDensity": 0.964706,
            "viewRank": 66561
          },
          {
            "tileIndex": 9611,
            "tileX": 107,
            "tileY": 44,
            "splatIndex": 80810,
            "originalId": 80810,
            "coverageWeight": 0.000059,
            "retentionWeight": 0.000028,
            "occlusionWeight": 0.000048,
            "occlusionDensity": 0.815686,
            "viewRank": 68274
          }
        ],
        "droppedByPolicySamples": [
          {
            "tileIndex": 9606,
            "tileX": 102,
            "tileY": 44,
            "splatIndex": 7442,
            "originalId": 7442,
            "coverageWeight": 0.000003,
            "retentionWeight": 0,
            "occlusionWeight": 0,
            "occlusionDensity": 0.129412,
            "viewRank": 63516
          },
          {
            "tileIndex": 9607,
            "tileX": 103,
            "tileY": 44,
            "splatIndex": 6393,
            "originalId": 6393,
            "coverageWeight": 0.000013,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000003,
            "occlusionDensity": 0.270588,
            "viewRank": 75319
          },
          {
            "tileIndex": 9607,
            "tileX": 103,
            "tileY": 44,
            "splatIndex": 7553,
            "originalId": 7553,
            "coverageWeight": 0.000011,
            "retentionWeight": 0.000001,
            "occlusionWeight": 0.000006,
            "occlusionDensity": 0.521569,
            "viewRank": 58916
          },
          {
            "tileIndex": 9608,
            "tileX": 104,
            "tileY": 44,
            "splatIndex": 7443,
            "originalId": 7443,
            "coverageWeight": 0.000084,
            "retentionWeight": 0.000005,
            "occlusionWeight": 0.000013,
            "occlusionDensity": 0.152941,
            "viewRank": 66562
          },
          {
            "tileIndex": 9608,
            "tileX": 104,
            "tileY": 44,
            "splatIndex": 6393,
            "originalId": 6393,
            "coverageWeight": 0.000043,
            "retentionWeight": 0.000004,
            "occlusionWeight": 0.000012,
            "occlusionDensity": 0.270588,
            "viewRank": 75319
          },
          {
            "tileIndex": 9609,
            "tileX": 105,
            "tileY": 44,
            "splatIndex": 7443,
            "originalId": 7443,
            "coverageWeight": 0.000162,
            "retentionWeight": 0.00001,
            "occlusionWeight": 0.000025,
            "occlusionDensity": 0.152941,
            "viewRank": 66562
          },
          {
            "tileIndex": 9609,
            "tileX": 105,
            "tileY": 44,
            "splatIndex": 8038,
            "originalId": 8038,
            "coverageWeight": 0.00006,
            "retentionWeight": 0.000009,
            "occlusionWeight": 0.000027,
            "occlusionDensity": 0.443137,
            "viewRank": 70385
          },
          {
            "tileIndex": 9609,
            "tileX": 105,
            "tileY": 44,
            "splatIndex": 7442,
            "originalId": 7442,
            "coverageWeight": 0.000059,
            "retentionWeight": 0.000003,
            "occlusionWeight": 0.000008,
            "occlusionDensity": 0.129412,
            "viewRank": 63516
          },
          {
            "tileIndex": 9610,
            "tileX": 106,
            "tileY": 44,
            "splatIndex": 7442,
            "originalId": 7442,
            "coverageWeight": 0.000114,
            "retentionWeight": 0.000005,
            "occlusionWeight": 0.000015,
            "occlusionDensity": 0.129412,
            "viewRank": 63516
          },
          {
            "tileIndex": 9610,
            "tileX": 106,
            "tileY": 44,
            "splatIndex": 6623,
            "originalId": 6623,
            "coverageWeight": 0.00008,
            "retentionWeight": 0.000008,
            "occlusionWeight": 0.000036,
            "occlusionDensity": 0.454902,
            "viewRank": 64532
          },
          {
            "tileIndex": 9610,
            "tileX": 106,
            "tileY": 44,
            "splatIndex": 17044,
            "originalId": 17044,
            "coverageWeight": 0.000064,
            "retentionWeight": 0.000009,
            "occlusionWeight": 0.000029,
            "occlusionDensity": 0.45098,
            "viewRank": 68100
          },
          {
            "tileIndex": 9611,
            "tileX": 107,
            "tileY": 44,
            "splatIndex": 7442,
            "originalId": 7442,
            "coverageWeight": 0.000186,
            "retentionWeight": 0.000009,
            "occlusionWeight": 0.000024,
            "occlusionDensity": 0.129412,
            "viewRank": 63516
          }
        ]
      },
      "regions": {
        "porousBody": {
          "region": "porous-body",
          "tileCount": 860,
          "cappedTileCount": 471,
          "projectedTileEntryCount": 1366632,
          "currentRetainedEntryCount": 149978,
          "legacyRetainedEntryCount": 149978,
          "addedByPolicyCount": 8480,
          "droppedByPolicyCount": 8480,
          "addedRetentionWeightSum": 385.002936,
          "droppedRetentionWeightSum": 208.195603,
          "addedOcclusionWeightSum": 583.453181,
          "droppedOcclusionWeightSum": 494.594363,
          "addedByPolicySamples": [
            {
              "tileIndex": 9606,
              "tileX": 102,
              "tileY": 44,
              "splatIndex": 59051,
              "originalId": 59051,
              "coverageWeight": 0.000002,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000001,
              "occlusionDensity": 0.843137,
              "viewRank": 55488
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 12701,
              "originalId": 12701,
              "coverageWeight": 0.00001,
              "retentionWeight": 0.000005,
              "occlusionWeight": 0.000009,
              "occlusionDensity": 0.835294,
              "viewRank": 50130
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 1582,
              "originalId": 1582,
              "coverageWeight": 0.000009,
              "retentionWeight": 0.000004,
              "occlusionWeight": 0.000007,
              "occlusionDensity": 0.768627,
              "viewRank": 43898
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 16318,
              "originalId": 16318,
              "coverageWeight": 0.000031,
              "retentionWeight": 0.000013,
              "occlusionWeight": 0.000029,
              "occlusionDensity": 0.945098,
              "viewRank": 78508
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 18321,
              "originalId": 18321,
              "coverageWeight": 0.000024,
              "retentionWeight": 0.000014,
              "occlusionWeight": 0.000022,
              "occlusionDensity": 0.898039,
              "viewRank": 53247
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 5515,
              "originalId": 5515,
              "coverageWeight": 0.000045,
              "retentionWeight": 0.000023,
              "occlusionWeight": 0.000039,
              "occlusionDensity": 0.854902,
              "viewRank": 51386
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 12701,
              "originalId": 12701,
              "coverageWeight": 0.000044,
              "retentionWeight": 0.000021,
              "occlusionWeight": 0.000036,
              "occlusionDensity": 0.835294,
              "viewRank": 50130
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 28733,
              "originalId": 28733,
              "coverageWeight": 0.000043,
              "retentionWeight": 0.000022,
              "occlusionWeight": 0.000033,
              "occlusionDensity": 0.756863,
              "viewRank": 74095
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 28584,
              "originalId": 28584,
              "coverageWeight": 0.000057,
              "retentionWeight": 0.000032,
              "occlusionWeight": 0.000048,
              "occlusionDensity": 0.843137,
              "viewRank": 72448
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 62985,
              "originalId": 62985,
              "coverageWeight": 0.000056,
              "retentionWeight": 0.000024,
              "occlusionWeight": 0.00004,
              "occlusionDensity": 0.705882,
              "viewRank": 52328
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 10714,
              "originalId": 10714,
              "coverageWeight": 0.000047,
              "retentionWeight": 0.000021,
              "occlusionWeight": 0.000045,
              "occlusionDensity": 0.964706,
              "viewRank": 66561
            },
            {
              "tileIndex": 9611,
              "tileX": 107,
              "tileY": 44,
              "splatIndex": 80810,
              "originalId": 80810,
              "coverageWeight": 0.000059,
              "retentionWeight": 0.000028,
              "occlusionWeight": 0.000048,
              "occlusionDensity": 0.815686,
              "viewRank": 68274
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 9606,
              "tileX": 102,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000003,
              "retentionWeight": 0,
              "occlusionWeight": 0,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 6393,
              "originalId": 6393,
              "coverageWeight": 0.000013,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000003,
              "occlusionDensity": 0.270588,
              "viewRank": 75319
            },
            {
              "tileIndex": 9607,
              "tileX": 103,
              "tileY": 44,
              "splatIndex": 7553,
              "originalId": 7553,
              "coverageWeight": 0.000011,
              "retentionWeight": 0.000001,
              "occlusionWeight": 0.000006,
              "occlusionDensity": 0.521569,
              "viewRank": 58916
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 7443,
              "originalId": 7443,
              "coverageWeight": 0.000084,
              "retentionWeight": 0.000005,
              "occlusionWeight": 0.000013,
              "occlusionDensity": 0.152941,
              "viewRank": 66562
            },
            {
              "tileIndex": 9608,
              "tileX": 104,
              "tileY": 44,
              "splatIndex": 6393,
              "originalId": 6393,
              "coverageWeight": 0.000043,
              "retentionWeight": 0.000004,
              "occlusionWeight": 0.000012,
              "occlusionDensity": 0.270588,
              "viewRank": 75319
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 7443,
              "originalId": 7443,
              "coverageWeight": 0.000162,
              "retentionWeight": 0.00001,
              "occlusionWeight": 0.000025,
              "occlusionDensity": 0.152941,
              "viewRank": 66562
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 8038,
              "originalId": 8038,
              "coverageWeight": 0.00006,
              "retentionWeight": 0.000009,
              "occlusionWeight": 0.000027,
              "occlusionDensity": 0.443137,
              "viewRank": 70385
            },
            {
              "tileIndex": 9609,
              "tileX": 105,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000059,
              "retentionWeight": 0.000003,
              "occlusionWeight": 0.000008,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000114,
              "retentionWeight": 0.000005,
              "occlusionWeight": 0.000015,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 6623,
              "originalId": 6623,
              "coverageWeight": 0.00008,
              "retentionWeight": 0.000008,
              "occlusionWeight": 0.000036,
              "occlusionDensity": 0.454902,
              "viewRank": 64532
            },
            {
              "tileIndex": 9610,
              "tileX": 106,
              "tileY": 44,
              "splatIndex": 17044,
              "originalId": 17044,
              "coverageWeight": 0.000064,
              "retentionWeight": 0.000009,
              "occlusionWeight": 0.000029,
              "occlusionDensity": 0.45098,
              "viewRank": 68100
            },
            {
              "tileIndex": 9611,
              "tileX": 107,
              "tileY": 44,
              "splatIndex": 7442,
              "originalId": 7442,
              "coverageWeight": 0.000186,
              "retentionWeight": 0.000009,
              "occlusionWeight": 0.000024,
              "occlusionDensity": 0.129412,
              "viewRank": 63516
            }
          ]
        },
        "centerLeakBand": {
          "region": "center-leak-band",
          "tileCount": 1501,
          "cappedTileCount": 898,
          "projectedTileEntryCount": 2788200,
          "currentRetainedEntryCount": 259648,
          "legacyRetainedEntryCount": 259648,
          "addedByPolicyCount": 26315,
          "droppedByPolicyCount": 26315,
          "addedRetentionWeightSum": 1300.389861,
          "droppedRetentionWeightSum": 1007.761581,
          "addedOcclusionWeightSum": 1695.687167,
          "droppedOcclusionWeightSum": 2231.51662,
          "addedByPolicySamples": [
            {
              "tileIndex": 10250,
              "tileX": 98,
              "tileY": 47,
              "splatIndex": 12702,
              "originalId": 12702,
              "coverageWeight": 0.000145,
              "retentionWeight": 0.000073,
              "occlusionWeight": 0.000131,
              "occlusionDensity": 0.898039,
              "viewRank": 57473
            },
            {
              "tileIndex": 10250,
              "tileX": 98,
              "tileY": 47,
              "splatIndex": 14181,
              "originalId": 14181,
              "coverageWeight": 0.000139,
              "retentionWeight": 0.000065,
              "occlusionWeight": 0.000116,
              "occlusionDensity": 0.835294,
              "viewRank": 55269
            },
            {
              "tileIndex": 10250,
              "tileX": 98,
              "tileY": 47,
              "splatIndex": 82844,
              "originalId": 82844,
              "coverageWeight": 0.00013,
              "retentionWeight": 0.000066,
              "occlusionWeight": 0.000115,
              "occlusionDensity": 0.878431,
              "viewRank": 62725
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 61226,
              "originalId": 61226,
              "coverageWeight": 0.000529,
              "retentionWeight": 0.000275,
              "occlusionWeight": 0.000492,
              "occlusionDensity": 0.929412,
              "viewRank": 76939
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 83071,
              "originalId": 83071,
              "coverageWeight": 0.000513,
              "retentionWeight": 0.000241,
              "occlusionWeight": 0.00044,
              "occlusionDensity": 0.858824,
              "viewRank": 65664
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 35826,
              "originalId": 35826,
              "coverageWeight": 0.000498,
              "retentionWeight": 0.000289,
              "occlusionWeight": 0.000444,
              "occlusionDensity": 0.890196,
              "viewRank": 73710
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 15280,
              "originalId": 15280,
              "coverageWeight": 0.000465,
              "retentionWeight": 0.000231,
              "occlusionWeight": 0.000374,
              "occlusionDensity": 0.803922,
              "viewRank": 72968
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 28416,
              "originalId": 28416,
              "coverageWeight": 0.000457,
              "retentionWeight": 0.00023,
              "occlusionWeight": 0.000339,
              "occlusionDensity": 0.741176,
              "viewRank": 61678
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 79457,
              "originalId": 79457,
              "coverageWeight": 0.00195,
              "retentionWeight": 0.000866,
              "occlusionWeight": 0.001476,
              "occlusionDensity": 0.756863,
              "viewRank": 74367
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 41837,
              "originalId": 41837,
              "coverageWeight": 0.001894,
              "retentionWeight": 0.000888,
              "occlusionWeight": 0.001315,
              "occlusionDensity": 0.694118,
              "viewRank": 79924
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 28416,
              "originalId": 28416,
              "coverageWeight": 0.001644,
              "retentionWeight": 0.000827,
              "occlusionWeight": 0.001218,
              "occlusionDensity": 0.741176,
              "viewRank": 61678
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 61226,
              "originalId": 61226,
              "coverageWeight": 0.001546,
              "retentionWeight": 0.000805,
              "occlusionWeight": 0.001437,
              "occlusionDensity": 0.929412,
              "viewRank": 76939
            }
          ],
          "droppedByPolicySamples": [
            {
              "tileIndex": 10250,
              "tileX": 98,
              "tileY": 47,
              "splatIndex": 41579,
              "originalId": 41579,
              "coverageWeight": 0.000329,
              "retentionWeight": 0.000031,
              "occlusionWeight": 0.000058,
              "occlusionDensity": 0.176471,
              "viewRank": 79352
            },
            {
              "tileIndex": 10250,
              "tileX": 98,
              "tileY": 47,
              "splatIndex": 61313,
              "originalId": 61313,
              "coverageWeight": 0.00031,
              "retentionWeight": 0.000016,
              "occlusionWeight": 0.000058,
              "occlusionDensity": 0.188235,
              "viewRank": 90574
            },
            {
              "tileIndex": 10250,
              "tileX": 98,
              "tileY": 47,
              "splatIndex": 85412,
              "originalId": 85412,
              "coverageWeight": 0.000182,
              "retentionWeight": 0.000018,
              "occlusionWeight": 0.000045,
              "occlusionDensity": 0.247059,
              "viewRank": 64220
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 45096,
              "originalId": 45096,
              "coverageWeight": 0.00072,
              "retentionWeight": 0.000061,
              "occlusionWeight": 0.000164,
              "occlusionDensity": 0.227451,
              "viewRank": 80454
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 40564,
              "originalId": 40564,
              "coverageWeight": 0.000718,
              "retentionWeight": 0.000093,
              "occlusionWeight": 0.000169,
              "occlusionDensity": 0.235294,
              "viewRank": 79307
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 41506,
              "originalId": 41506,
              "coverageWeight": 0.000661,
              "retentionWeight": 0.00009,
              "occlusionWeight": 0.000244,
              "occlusionDensity": 0.368627,
              "viewRank": 79238
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 78425,
              "originalId": 78425,
              "coverageWeight": 0.000617,
              "retentionWeight": 0.000051,
              "occlusionWeight": 0.000097,
              "occlusionDensity": 0.156863,
              "viewRank": 69314
            },
            {
              "tileIndex": 10251,
              "tileX": 99,
              "tileY": 47,
              "splatIndex": 12246,
              "originalId": 12246,
              "coverageWeight": 0.000615,
              "retentionWeight": 0.000104,
              "occlusionWeight": 0.000145,
              "occlusionDensity": 0.235294,
              "viewRank": 72124
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 62736,
              "originalId": 62736,
              "coverageWeight": 0.003943,
              "retentionWeight": 0.00038,
              "occlusionWeight": 0.001067,
              "occlusionDensity": 0.270588,
              "viewRank": 81068
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 78003,
              "originalId": 78003,
              "coverageWeight": 0.003654,
              "retentionWeight": 0.000347,
              "occlusionWeight": 0.000903,
              "occlusionDensity": 0.247059,
              "viewRank": 75946
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 6303,
              "originalId": 6303,
              "coverageWeight": 0.002111,
              "retentionWeight": 0.000358,
              "occlusionWeight": 0.001026,
              "occlusionDensity": 0.486274,
              "viewRank": 81205
            },
            {
              "tileIndex": 10252,
              "tileX": 100,
              "tileY": 47,
              "splatIndex": 34286,
              "originalId": 34286,
              "coverageWeight": 0.002103,
              "retentionWeight": 0.000316,
              "occlusionWeight": 0.000817,
              "occlusionDensity": 0.388235,
              "viewRank": 79677
            }
          ]
        }
      }
    },
    "coverageWeight": {
      "min": 0,
      "max": 9.93111,
      "mean": 0.16795
    },
    "alpha": {
      "maxSourceOpacity": 1,
      "meanSourceOpacity": 0.322393,
      "estimatedMaxAccumulatedAlpha": 1,
      "estimatedMinTransmittance": 0,
      "alphaParamRefs": 350464
    },
    "conicShape": {
      "maxMajorRadiusPx": 143.340055,
      "minMinorRadiusPx": 1.5,
      "maxAnisotropyRatio": 53.327135
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
      "maxAnisotropyRatio": 66.95086118888399,
      "suspiciousSplatCount": 1296,
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
          "maxProjectedAnisotropyRatio": 66.95086118888399,
          "suspiciousProjectedSplatCount": 1296,
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
          "maxProjectedAnisotropyRatio": 67.19421246302099,
          "suspiciousProjectedSplatCount": 1956,
          "projectedSplatCount": 94406,
          "sampleOriginalIds": [
            87,
            93,
            131,
            250,
            463,
            549,
            632,
            692
          ]
        }
      },
      "footprint": {
        "maxMajorRadiusPx": 127.80461197878985,
        "maxMinorRadiusPx": 56.65088931020897,
        "maxAreaPx": 19423.54597138146,
        "areaCapPx": 62346.24,
        "majorRadiusCapPx": 1172.6000000000001,
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
          "projectedCenterCount": 0,
          "projectedSupportCount": 0,
          "nearFloorMinorCount": 0,
          "maxMajorRadiusPx": 0,
          "medianMajorRadiusPx": 0,
          "medianMinorRadiusPx": 0,
          "supportAreaPxSum": 0,
          "sampleOriginalIds": []
        },
        "porousBody": {
          "crop": {
            "x": 520,
            "y": 270,
            "width": 260,
            "height": 150
          },
          "projectedCenterCount": 0,
          "projectedSupportCount": 0,
          "nearFloorMinorCount": 0,
          "maxMajorRadiusPx": 0,
          "medianMajorRadiusPx": 0,
          "medianMinorRadiusPx": 0,
          "supportAreaPxSum": 0,
          "sampleOriginalIds": []
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
        "maxTileAlphaMass": 359575.7989110461,
        "maxTileSplatCount": 8614,
        "hotTileCount": 125,
        "tileEntryCount": 392535,
        "maxSplatCoveredTileCount": 112,
        "maxCenterTileDroppedCoverageFraction": 1,
        "sampleOriginalIds": [
          0,
          1,
          2,
          5,
          6,
          16,
          17,
          19
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
  "statsText": "3456×1804 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/125 tiles | tile-local: 216x113 tiles/350464 refs | tile-local budget: cap 20,000,000 | per-tile cap 256 | tile-budget: 16px/256 refs | visible-compositor cap: 256 refs | tile-order: gpu-sorted-index-rank-inversion | arena requested: gpu | arena effective: gpu | arena CPU build: 26167.700ms | arena GPU dispatch: 0.000ms",
  "title": "Deferred Splat+Mesh Renderer",
  "bodyText": "3456×1804 | 0 fps | 94,406 real Scaniverse splats | renderer: tile-local-visible-gaussian-compositor | sort: gpu-bitonic-cpu-depth-keys | alpha: coverage-aware density 94,406 splats/125 tiles | tile-local: 216x113 tiles/350464 refs | tile-local budget: cap 20,000,000 | per-tile cap 256 | tile-budget: 16px/256 refs | visible-compositor cap: 256 refs | tile-order: gpu-sorted-index-rank-inversion | arena requested: gpu | arena effective: gpu | arena CPU build: 26167.700ms | arena GPU dispatch: 0.000ms",
  "canvas": {
    "width": 3456,
    "height": 1804,
    "clientWidth": 3456,
    "clientHeight": 1804
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
