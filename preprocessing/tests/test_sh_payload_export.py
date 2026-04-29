from __future__ import annotations

import math
import tempfile
import unittest
from pathlib import Path

import numpy as np

from splat_oracle.first_smoke import export_first_smoke_asset
from splat_oracle.loader import load_ply


class ShPayloadExportTests(unittest.TestCase):
    def test_ply_f_rest_fields_decode_to_splat_coeff_rgb_layout(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            source = Path(tmp) / "degree-one-sh.ply"
            self._write_ascii_ply(
                source,
                [
                    self._row(
                        f_rest=(10.0, 11.0, 12.0, 20.0, 21.0, 22.0, 30.0, 31.0, 32.0)
                    )
                ],
            )

            cloud = load_ply(source)

            self.assertEqual(cloud.sh_degree, 1)
            self.assertIsNotNone(cloud.sh_coeffs)
            np.testing.assert_allclose(
                cloud.sh_coeffs,
                np.array([[[10.0, 20.0, 30.0], [11.0, 21.0, 31.0], [12.0, 22.0, 32.0]]], dtype=np.float32),
            )

    def test_export_writes_optional_higher_order_sh_sidecar(self) -> None:
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            source = root / "degree-one-sh.ply"
            output = root / "asset"
            self._write_ascii_ply(
                source,
                [
                    self._row(
                        x=1.0,
                        f_rest=(0.25, -0.5, 0.75, 1.0, -1.25, 1.5, 2.0, -2.25, 2.5),
                    ),
                    self._row(
                        x=-1.0,
                        f_rest=(3.0, 3.25, 3.5, 4.0, 4.25, 4.5, 5.0, 5.25, 5.5),
                    ),
                ],
            )

            manifest = export_first_smoke_asset(source, output, asset_name="sh")

            self.assertEqual(
                manifest["sh"],
                {
                    "degree": 1,
                    "basis": "3dgs_real_sh",
                    "coefficients_layout": "splat_coeff_rgb",
                    "coefficients_path": "sh.sh.f32.bin",
                    "coefficients_component_type": "float32",
                    "coefficient_count": 3,
                    "coefficients_byte_length": 2 * 3 * 3 * 4,
                    "dc_source": "payload.color contains displayable RGB decoded from SH DC",
                },
            )
            coeffs = np.fromfile(output / "sh.sh.f32.bin", dtype="<f4").reshape(2, 3, 3)
            np.testing.assert_allclose(
                coeffs[0],
                np.array([[0.25, 1.0, 2.0], [-0.5, -1.25, -2.25], [0.75, 1.5, 2.5]], dtype=np.float32),
            )
            np.testing.assert_allclose(
                coeffs[1],
                np.array([[3.0, 4.0, 5.0], [3.25, 4.25, 5.25], [3.5, 4.5, 5.5]], dtype=np.float32),
            )

    @staticmethod
    def _row(
        *,
        x: float = 0.0,
        y: float = 0.0,
        z: float = 2.0,
        f_rest: tuple[float, ...],
    ) -> tuple[float, ...]:
        return (
            x,
            y,
            z,
            0.0,
            0.0,
            0.0,
            0.0,
            math.log(1.0),
            math.log(1.0),
            math.log(1.0),
            1.0,
            0.0,
            0.0,
            0.0,
            *f_rest,
        )

    @staticmethod
    def _write_ascii_ply(path: Path, rows: list[tuple[float, ...]]) -> None:
        rest_fields = "\n".join(f"property float f_rest_{index}" for index in range(9))
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
{rest_fields}
end_header
""".format(count=len(rows), rest_fields=rest_fields)
        body = "\n".join(" ".join(f"{value:.9g}" for value in row) for row in rows)
        path.write_text(header + body + "\n")


if __name__ == "__main__":
    unittest.main()
