# Scaniverse First-Smoke Splat Asset

Lane: `scaniverse-ply-gutspill`

Source: real Scaniverse PLY `Kaths_dessert .ply`

Source SHA-256: `2ce79fcebcd9a8a53b32e7b489a8a522bd6e1a6bae7c71682a9a984c5b41ecc7`

Generated files:

- `smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.json`
- `smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.f32.bin`
- `smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.ids.u32.bin`
- `smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.scales.f32.bin`
- `smoke-assets/scaniverse-first-smoke/scaniverse-first-smoke.rotations.f32.bin`

## Browser Payload Contract

Schema: `scaniverse_first_smoke_splat_v1`

The payload binary is little-endian `float32`, one 32-byte row per original PLY vertex:

| Field | Components | Byte offset | Decode |
| --- | ---: | ---: | --- |
| `position` | 3 | 0 | PLY `x`, `y`, `z` |
| `color` | 3 | 12 | Displayable RGB from `0.5 + 0.28209479 * f_dc_*`, clamped to `[0, 1]` |
| `opacity` | 1 | 24 | `sigmoid(opacity)` from the PLY logit field |
| `radius` | 1 | 28 | `max(exp(scale_0), exp(scale_1), exp(scale_2))` |

Original 0-based splat identity is preserved by row order: row `i` is original file-order splat ID `i`. The `ids.u32.bin` sidecar stores the same `0..N-1` IDs explicitly for consumers that want an identity buffer.

Anisotropic Gaussian shape is preserved in sidecars:

| Sidecar | Components | Decode |
| --- | ---: | --- |
| `scales.f32.bin` | 3 | PLY log-space `scale_0`, `scale_1`, `scale_2` |
| `rotations.f32.bin` | 4 | PLY quaternion `rot_0..3` in `wxyz` order |

## Real Asset Metadata

- Splat count: `94406`
- Payload bytes: `3020992`
- ID sidecar bytes: `377624`
- Scale sidecar bytes: `1132872`
- Rotation sidecar bytes: `1510496`
- Bounds min: `[-0.16349449753761292, -0.046466678380966187, -0.13291534781455994]`
- Bounds max: `[0.15828284621238708, 0.06754699349403381, 0.14955535531044006]`
- Bounds center: `[-0.002605825662612915, 0.010540157556533813, 0.008320003747940063]`
- Bounds radius: `0.22154541313648224`

Generated with:

```bash
env PYTHONPATH=preprocessing uv run --no-project --with numpy --with plyfile scripts/export_scaniverse_ply_first_smoke.py "/Users/noahlyons/Library/Mobile Documents/com~apple~CloudDocs/Splats/Kaths_dessert .ply" --output smoke-assets/scaniverse-first-smoke --asset-name scaniverse-first-smoke
```
