from __future__ import annotations

import json
import math
import tempfile
import unittest
from pathlib import Path

import numpy as np

from splat_oracle.first_smoke import export_first_smoke_asset, source_kind


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
            scales_path = output / "fixture.scales.f32.bin"
            rotations_path = output / "fixture.rotations.f32.bin"

            self.assertEqual(manifest, json.loads(manifest_path.read_text()))
            self.assertEqual(manifest["schema"], "scaniverse_first_smoke_splat_v1")
            self.assertEqual(manifest["source"]["kind"], "scaniverse_ply")
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
            self.assertEqual(
                manifest["shape"],
                {
                    "scales_path": "fixture.scales.f32.bin",
                    "scales_component_type": "float32",
                    "scales_byte_length": 3 * 3 * 4,
                    "rotations_path": "fixture.rotations.f32.bin",
                    "rotations_component_type": "float32",
                    "rotations_byte_length": 3 * 4 * 4,
                    "rotation_order": "wxyz",
                    "scale_space": "log",
                },
            )
            np.testing.assert_allclose(
                np.fromfile(scales_path, dtype="<f4").reshape(3, 3),
                np.array(
                    [
                        [0.0, math.log(2.0), math.log(0.5)],
                        [math.log(0.25), math.log(0.75), math.log(1.5)],
                        [math.log(3.0), math.log(0.125), math.log(1.0)],
                    ],
                    dtype=np.float32,
                ),
                rtol=1e-6,
            )
            np.testing.assert_allclose(
                np.fromfile(rotations_path, dtype="<f4").reshape(3, 4),
                np.array(
                    [
                        [1.0, 0.0, 0.0, 0.0],
                        [1.0, 0.0, 0.0, 0.0],
                        [1.0, 0.0, 0.0, 0.0],
                    ],
                    dtype=np.float32,
                ),
            )

    def test_source_kind_supports_spz_assets(self) -> None:
        self.assertEqual(source_kind(Path("workshop_four_cups.spz")), "spz")
        self.assertEqual(source_kind(Path("scan.ply")), "scaniverse_ply")

    def test_export_can_drop_outer_shell_splats(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "shell.ply"
            output = root / "asset"
            self._write_ascii_ply_rows(
                source,
                [
                    self._ply_row(0.0, 0.0, 0.0),
                    self._ply_row(1.0, 0.0, 0.0),
                    self._ply_row(100.0, 0.0, 0.0),
                    self._ply_row(-100.0, 0.0, 0.0),
                ],
            )

            manifest = export_first_smoke_asset(
                source,
                output,
                asset_name="shell-core",
                max_distance_from_source_bbox_center=2.0,
            )

            self.assertEqual(manifest["splat_count"], 2)
            self.assertEqual(
                manifest["identity"]["scheme"],
                "row_index_is_filtered_zero_based_payload_order",
            )
            self.assertEqual(
                manifest["source_filter"],
                {
                    "kind": "radial_distance_from_source_bbox_center",
                    "source_bbox_center": [0.0, 0.0, 0.0],
                    "max_distance": 2.0,
                    "input_splat_count": 4,
                    "kept_splat_count": 2,
                    "dropped_splat_count": 2,
                    "identity_note": "IDs are zero-based filtered payload row indices for renderer addressing, not original source-file row numbers.",
                },
            )
            self.assertEqual(list(np.fromfile(output / "shell-core.ids.u32.bin", dtype="<u4")), [0, 1])
            rows = np.fromfile(output / "shell-core.f32.bin", dtype="<f4").reshape(2, 8)
            np.testing.assert_allclose(
                rows[:, 0:3],
                np.array([[0.0, 0.0, 0.0], [1.0, 0.0, 0.0]], dtype=np.float32),
            )
            self.assertEqual(manifest["bounds"]["min"], [0.0, 0.0, 0.0])
            self.assertEqual(manifest["bounds"]["max"], [1.0, 0.0, 0.0])
            self.assertEqual(manifest["bounds"]["center"], [0.5, 0.0, 0.0])

    @staticmethod
    def _write_ascii_ply(path: Path) -> None:
        rows = [
            FirstSmokeExportTests._ply_row(
                0.0,
                -1.0,
                2.0,
                dc=(0.0, 1.0, -1.0),
                opacity=0.0,
                scales=(0.0, math.log(2.0), math.log(0.5)),
            ),
            FirstSmokeExportTests._ply_row(
                2.0,
                3.0,
                -2.0,
                dc=(2.0, -2.0, 0.5),
                opacity=-2.0,
                scales=(math.log(0.25), math.log(0.75), math.log(1.5)),
            ),
            FirstSmokeExportTests._ply_row(
                -4.0,
                5.0,
                6.0,
                dc=(-4.0, 0.25, 4.0),
                opacity=4.0,
                scales=(math.log(3.0), math.log(0.125), math.log(1.0)),
            ),
        ]
        FirstSmokeExportTests._write_ascii_ply_rows(path, rows)

    @staticmethod
    def _ply_row(
        x: float,
        y: float,
        z: float,
        *,
        dc: tuple[float, float, float] = (0.0, 0.0, 0.0),
        opacity: float = 0.0,
        scales: tuple[float, float, float] = (0.0, 0.0, 0.0),
    ) -> tuple[float, ...]:
        return (
            x,
            y,
            z,
            dc[0],
            dc[1],
            dc[2],
            opacity,
            scales[0],
            scales[1],
            scales[2],
            1.0,
            0.0,
            0.0,
            0.0,
        )

    @staticmethod
    def _write_ascii_ply_rows(path: Path, rows: list[tuple[float, ...]]) -> None:
        header = """ply
format ascii 1.0
element vertex {count}
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
""".format(count=len(rows))
        body = "\n".join(" ".join(f"{value:.9g}" for value in row) for row in rows)
        path.write_text(header + body + "\n")


if __name__ == "__main__":
    unittest.main()
