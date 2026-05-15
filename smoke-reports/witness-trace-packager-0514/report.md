# Witness Trace Bundle

- Status: FAIL
- Generated: 2026-05-15T02:47:11.018Z
- Smoke URL: http://127.0.0.1:61625/?asset=/smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json&witnessView=dessert-porous-close&tileSizePx=16&maxRefsPerTile=256&arenaBackend=gpu&renderer=tile-local-visible
- Branch: cc/witness-trace-packager
- Commit: 074005a2703469eb8c3a109717272bd68ae63ac6
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
    "status": "present",
    "source": {
      "lane": "retention-pixel-trace",
      "ref": "origin/cc/retention-pixel-trace-0514@79cb725fb7ec55c1fb8f2c22276e58945b0a8744",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Retention lane landed in report def83a63 on the retention branch; the bundle no longer uses a stale missing placeholder for this section."
  },
  "ordering": {
    "status": "present",
    "source": {
      "lane": "ordering-band-row-trace",
      "ref": "origin/cc/ordering-band-row-trace-0514@13cfcca",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Ordering lane landed in report 8176bf3f on the ordering branch; the bundle no longer uses a stale missing placeholder for this section."
  },
  "finalAccumulation": {
    "status": "present",
    "source": {
      "lane": "final-accumulation-trace",
      "ref": "origin/cc/final-accumulation-trace-0515@f5f0fbb7689dac0cc3ef997f0e3cdb4ccf0d2cd5",
      "packetPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.md",
      "thesisPath": "metadosis/coordination-packets/meshsplat-pixel-contributor-trace-substrate_2026-05-14.thesis.md"
    },
    "note": "Final accumulation lane landed in report db4c263e on the final-accumulation branch; the bundle no longer uses a stale missing placeholder for this section."
  }
}
```

## Pass / Fail Notes

- FAIL: Static dessert witness did not report crop-local rim source support.
- missing-rim-source-support: Static dessert witness did not report crop-local rim source support.
- missing-porous-body-source-support: Static dessert witness did not report crop-local porous body source support.
- tile-local-visible-footprint-expansion: Tile-local final color changed 114.60x as many pixels as plate on the fixed dessert witness.
- retention: landed report def83a63 on origin/cc/retention-pixel-trace-0514@79cb725fb7ec55c1fb8f2c22276e58945b0a8744; explicit placeholder retired from the bundle
- ordering: landed report 8176bf3f on origin/cc/ordering-band-row-trace-0514@13cfcca; explicit placeholder retired from the bundle
- finalAccumulation: landed report db4c263e on origin/cc/final-accumulation-trace-0515@f5f0fbb7689dac0cc3ef997f0e3cdb4ccf0d2cd5; explicit placeholder retired from the bundle
