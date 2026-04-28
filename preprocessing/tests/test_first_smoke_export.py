from __future__ import annotations

import json
import math
import tempfile
import unittest
from pathlib import Path

import numpy as np

from splat_oracle.first_smoke import export_first_smoke_asset


SH_C0 = 0.28209479


class FirstSmokeExportTests(unittest.TestCase):
    def test_export_preserves_file_order_ids_and_bounds(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "fixture.ply"
            output = root / "asset"
            self._write_ascii_ply(source)

            manifest = export_first_smoke_asset(source, output, asset_name="fixture")

            manifest_path = output / "fixture.json"
            payload_path = output / "fixture.f32.bin"
            ids_path = output / "fixture.ids.u32.bin"

            self.assertEqual(manifest, json.loads(manifest_path.read_text()))
            self.assertEqual(manifest["schema"], "scaniverse_first_smoke_splat_v1")
            self.assertEqual(manifest["splat_count"], 3)
            self.assertEqual(manifest["stride_bytes"], 32)
            self.assertEqual(
                manifest["identity"],
                {
                    "scheme": "row_index_is_original_zero_based_file_order",
                    "ids_component_type": "uint32",
                    "ids_path": "fixture.ids.u32.bin",
                },
            )
            self.assertEqual(
                manifest["fields"],
                [
                    {
                        "name": "position",
                        "component_type": "float32",
                        "components": 3,
                        "byte_offset": 0,
                    },
                    {
                        "name": "color",
                        "component_type": "float32",
                        "components": 3,
                        "byte_offset": 12,
                    },
                    {
                        "name": "opacity",
                        "component_type": "float32",
                        "components": 1,
                        "byte_offset": 24,
                    },
                    {
                        "name": "radius",
                        "component_type": "float32",
                        "components": 1,
                        "byte_offset": 28,
                    },
                ],
            )

            rows = np.fromfile(payload_path, dtype="<f4").reshape(3, 8)
            np.testing.assert_allclose(
                rows[:, 0:3],
                np.array(
                    [
                        [0.0, -1.0, 2.0],
                        [2.0, 3.0, -2.0],
                        [-4.0, 5.0, 6.0],
                    ],
                    dtype=np.float32,
                ),
            )
            np.testing.assert_allclose(
                rows[:, 3:6],
                np.clip(
                    0.5
                    + SH_C0
                    * np.array(
                        [
                            [0.0, 1.0, -1.0],
                            [2.0, -2.0, 0.5],
                            [-4.0, 0.25, 4.0],
                        ],
                        dtype=np.float32,
                    ),
                    0.0,
                    1.0,
                ),
            )
            np.testing.assert_allclose(
                rows[:, 6],
                np.array(
                    [
                        0.5,
                        1.0 / (1.0 + math.exp(2.0)),
                        1.0 / (1.0 + math.exp(-4.0)),
                    ]
                ),
                rtol=1e-6,
            )
            np.testing.assert_allclose(
                rows[:, 7],
                np.exp(
                    np.array(
                        [
                            [0.0, math.log(2.0), math.log(0.5)],
                            [math.log(0.25), math.log(0.75), math.log(1.5)],
                            [math.log(3.0), math.log(0.125), math.log(1.0)],
                        ],
                        dtype=np.float32,
                    )
                ).max(axis=1),
                rtol=1e-6,
            )

            self.assertEqual(list(np.fromfile(ids_path, dtype="<u4")), [0, 1, 2])
            self.assertEqual(manifest["bounds"]["min"], [-4.0, -1.0, -2.0])
            self.assertEqual(manifest["bounds"]["max"], [2.0, 5.0, 6.0])
            self.assertEqual(manifest["bounds"]["center"], [-1.0, 2.0, 2.0])
            self.assertAlmostEqual(
                manifest["bounds"]["radius"], math.sqrt(34.0), places=6
            )
            self.assertEqual(manifest["payload"]["path"], "fixture.f32.bin")
            self.assertEqual(manifest["payload"]["byte_length"], 3 * 32)

    @staticmethod
    def _write_ascii_ply(path: Path) -> None:
        rows = [
            (
                0.0,
                -1.0,
                2.0,
                0.0,
                1.0,
                -1.0,
                0.0,
                0.0,
                math.log(2.0),
                math.log(0.5),
                1.0,
                0.0,
                0.0,
                0.0,
            ),
            (
                2.0,
                3.0,
                -2.0,
                2.0,
                -2.0,
                0.5,
                -2.0,
                math.log(0.25),
                math.log(0.75),
                math.log(1.5),
                1.0,
                0.0,
                0.0,
                0.0,
            ),
            (
                -4.0,
                5.0,
                6.0,
                -4.0,
                0.25,
                4.0,
                4.0,
                math.log(3.0),
                math.log(0.125),
                math.log(1.0),
                1.0,
                0.0,
                0.0,
                0.0,
            ),
        ]
        header = """ply
format ascii 1.0
element vertex 3
property float x
property float y
property float z
property float f_dc_0
property float f_dc_1
property float f_dc_2
property float opacity
property float scale_0
property float scale_1
property float scale_2
property float rot_0
property float rot_1
property float rot_2
property float rot_3
end_header
"""
        body = "\n".join(" ".join(f"{value:.9g}" for value in row) for row in rows)
        path.write_text(header + body + "\n")


if __name__ == "__main__":
    unittest.main()
