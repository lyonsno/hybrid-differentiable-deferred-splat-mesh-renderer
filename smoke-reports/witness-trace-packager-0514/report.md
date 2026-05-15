# Witness Trace Bundle

- Status: PROVISIONAL
- Generated: 2026-05-15T02:30:56.874Z
- Smoke URL: http://127.0.0.1:61625/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible
- Branch: cc/witness-trace-packager
- Commit: 82ad1aa071dab515529b4f470c079e9fbbfa53fd
- Packet: `metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md`
- Thesis: `metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md`
- Steward topos: `pixel-trace-steward-0514`
- Viewport: 3456x1916
- Summary: FAIL: Static dessert witness did not report crop-local rim source support.

## Anchor Pixels

### lacunar-hole-dessert-1260-930

- Label: lacunar hole dessert
- Pixel: 1260, 930
- Crop: 1132, 802, 256x256
- Status: present

### dense-foreground-leak-1580-1260

- Label: dense foreground leak
- Pixel: 1580, 1260
- Crop: 1452, 1132, 256x256
- Status: present

### black-band-dropout-2300-1055

- Label: black band dropout
- Pixel: 2300, 1055
- Crop: 2108, 959, 384x192
- Status: present


## Crops

### lacunar-hole-dessert-1260-930-crop

- Source capture: final-color
- Source screenshot: `smoke-reports/witness-trace-packager-0514/final-color.png`
- Output path: `crops/lacunar-hole-dessert-1260-930.png`
- Box: 1132, 802, 256x256
- Status: present

### dense-foreground-leak-1580-1260-crop

- Source capture: final-color
- Source screenshot: `smoke-reports/witness-trace-packager-0514/final-color.png`
- Output path: `crops/dense-foreground-leak-1580-1260.png`
- Box: 1452, 1132, 256x256
- Status: present

### black-band-dropout-2300-1055-crop

- Source capture: final-color
- Source screenshot: `smoke-reports/witness-trace-packager-0514/final-color.png`
- Output path: `crops/black-band-dropout-2300-1055.png`
- Box: 2108, 959, 384x192
- Status: present


## Trace JSON

```json
{
  "schema": {
    "status": "present",
    "source": {
      "lane": "trace-schema-anchor",
      "ref": "origin/cc/trace-schema-anchor-0514@3cd5919",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Canonical trace schema is consumed, not redefined, by the witness bundle."
  },
  "projection": {
    "status": "present",
    "source": {
      "lane": "projection-pixel-trace",
      "ref": "origin/cc/projection-pixel-trace-0514@ba76a485cf34bf514eca1d862399eb6e71fcd1ef",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Projection provenance is referenced from the sibling report surface."
  },
  "syntheticParity": {
    "status": "present",
    "source": {
      "lane": "synthetic-trace-parity-oracle",
      "ref": "origin/cc/synthetic-trace-parity-oracle-0514@b3eadeba5d607753270c190d3f27b7e4f2b586e7",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Synthetic parity provenance is referenced from the sibling report surface."
  },
  "retention": {
    "status": "missing",
    "source": {
      "lane": "retention-pixel-trace",
      "ref": "pending",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Retention lane has not landed in this bundle yet."
  },
  "ordering": {
    "status": "missing",
    "source": {
      "lane": "ordering-band-row-trace",
      "ref": "pending",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Ordering lane has not landed in this bundle yet."
  },
  "finalAccumulation": {
    "status": "missing",
    "source": {
      "lane": "final-accumulation-trace",
      "ref": "pending",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Final accumulation lane has not landed in this bundle yet."
  }
}
```

## Pass / Fail Notes

- FAIL: Static dessert witness did not report crop-local rim source support.
- missing-rim-source-support: Static dessert witness did not report crop-local rim source support.
- missing-porous-body-source-support: Static dessert witness did not report crop-local porous body source support.
- tile-local-visible-footprint-expansion: Tile-local final color changed 114.60x as many pixels as plate on the fixed dessert witness.
- missing retention: explicit placeholder kept until the retention lane lands
- missing ordering: explicit placeholder kept until the ordering lane lands
- missing finalAccumulation: explicit placeholder kept until the final accumulation lane lands
