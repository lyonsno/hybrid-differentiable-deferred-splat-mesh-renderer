from __future__ import annotations

import math
import tempfile
import unittest
from pathlib import Path

import numpy as np

from splat_oracle.first_smoke import export_first_smoke_asset


SH_C0 = 0.28209479


class FieldSemanticsExportTests(unittest.TestCase):
    def test_export_manifest_and_sidecars_preserve_field_semantics(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "field-semantics.ply"
            output = root / "asset"
            self._write_ascii_ply(
                source,
                [
                    (
                        1.0,
                        -2.0,
                        3.0,
                        0.0,
                        1.0,
                        -1.0,
                        -2.0,
                        math.log(0.25),
                        math.log(2.0),
                        math.log(4.0),
                        0.5,
                        -0.5,
                        0.5,
                        -0.5,
                    ),
                    (
                        -1.0,
                        0.0,
                        2.0,
                        2.0,
                        -2.0,
                        0.5,
                        4.0,
                        math.log(3.0),
                        math.log(0.5),
                        math.log(1.0),
                        0.25,
                        0.5,
                        -0.5,
                        0.75,
                    ),
                ],
            )

            manifest = export_first_smoke_asset(source, output, asset_name="field")

            self.assertEqual(manifest["shape"]["scale_space"], "log")
            self.assertEqual(manifest["shape"]["rotation_order"], "wxyz")
            self.assertIn("SH DC", manifest["decode"]["color"])
            self.assertIn("sigmoid", manifest["decode"]["opacity"])
            self.assertIn("exp", manifest["decode"]["radius"])

            rows = np.fromfile(output / "field.f32.bin", dtype="<f4").reshape(2, 8)
            scales = np.fromfile(output / "field.scales.f32.bin", dtype="<f4").reshape(2, 3)
            rotations = np.fromfile(output / "field.rotations.f32.bin", dtype="<f4").reshape(2, 4)

            np.testing.assert_allclose(
                rows[:, 3:6],
                np.clip(
                    0.5
                    + SH_C0
                    * np.array([[0.0, 1.0, -1.0], [2.0, -2.0, 0.5]], dtype=np.float32),
                    0.0,
                    1.0,
                ),
                rtol=1e-6,
            )
            np.testing.assert_allclose(
                rows[:, 6],
                np.array(
                    [1.0 / (1.0 + math.exp(2.0)), 1.0 / (1.0 + math.exp(-4.0))],
                    dtype=np.float32,
                ),
                rtol=1e-6,
            )
            np.testing.assert_allclose(
                rows[:, 7],
                np.array([4.0, 3.0], dtype=np.float32),
                rtol=1e-6,
            )
            np.testing.assert_allclose(
                scales,
                np.array(
                    [
                        [math.log(0.25), math.log(2.0), math.log(4.0)],
                        [math.log(3.0), math.log(0.5), math.log(1.0)],
                    ],
                    dtype=np.float32,
                ),
                rtol=1e-6,
            )
            np.testing.assert_allclose(
                rotations,
                np.array(
                    [[0.5, -0.5, 0.5, -0.5], [0.25, 0.5, -0.5, 0.75]],
                    dtype=np.float32,
                ),
                rtol=1e-6,
            )

    @staticmethod
    def _write_ascii_ply(path: Path, rows: list[tuple[float, ...]]) -> None:
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
