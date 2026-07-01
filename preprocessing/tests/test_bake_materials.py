from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

import numpy as np


def load_bake_materials_module():
    root = Path(__file__).resolve().parents[1]
    module_path = root / "splat_bake" / "bake_materials.py"

    stubs = {
        "plyfile": types.SimpleNamespace(PlyData=object, PlyElement=object),
        "PIL": types.SimpleNamespace(Image=object),
        "PIL.Image": object,
    }
    previous = {name: sys.modules.get(name) for name in stubs}
    try:
        for name, stub in stubs.items():
            sys.modules[name] = stub
        spec = importlib.util.spec_from_file_location("bake_materials_under_test", module_path)
        assert spec is not None
        assert spec.loader is not None
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module
    finally:
        for name, module in previous.items():
            if module is None:
                sys.modules.pop(name, None)
            else:
                sys.modules[name] = module


class BakeMaterialsTests(unittest.TestCase):
    def test_explicit_crop_matrix_matches_renderer_crop_contract(self) -> None:
        bake_materials = load_bake_materials_module()
        positions = np.array(
            [
                [1.0, 0.0, 0.0],
                [-1.0, 0.0, 0.0],
                [2.0, 0.0, 0.0],
            ],
            dtype=np.float32,
        )

        corrected, crop_mask = bake_materials.apply_sidecar_correction(
            positions,
            {
                "axisFlips": [-1, 1, 1],
                "crop": {
                    "enabled": True,
                    "frame": "visual-root-local",
                    "sourceToCropMatrix": [
                        1, 0, 0, 0,
                        0, 1, 0, 0,
                        0, 0, 1, 0,
                        0, 0, 0, 1,
                    ],
                    "min": [0.5, -0.5, -0.5],
                    "max": [1.5, 0.5, 0.5],
                },
            },
        )

        np.testing.assert_allclose(corrected, positions)
        np.testing.assert_array_equal(crop_mask, np.array([True, False, False]))

    def test_renderer_camera_projection_uses_renderer_viewproj_matrix(self) -> None:
        bake_materials = load_bake_materials_module()
        positions = np.array([[0.5, 0.5, -2.0]], dtype=np.float32)
        camera = {
            "viewportWidth": 100,
            "viewportHeight": 100,
            "viewMatrix": [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, 0,
                0, 0, 0, 1,
            ],
            "projectionMatrix": [
                1, 0, 0, 0,
                0, 1, 0, 0,
                0, 0, 1, -1,
                0, 0, -1, 0,
            ],
            "viewProjMatrix": [
                2, 0, 0, 0,
                0, -1, 0, 0,
                0, 0, 1, -1,
                0, 0, -1, 0,
            ],
        }

        uv, valid = bake_materials.project_with_renderer_camera(
            positions,
            camera,
            (100, 100),
        )

        np.testing.assert_array_equal(valid, np.array([True]))
        np.testing.assert_allclose(uv[0], [75.0, 62.5], atol=1e-6)

    def test_legacy_sidecar_crop_uses_kaminos_preview_normalization(self) -> None:
        bake_materials = load_bake_materials_module()
        positions = np.array(
            [
                [-4.0, 0.0, 0.0],
                [-1.0, 0.0, 0.0],
                [4.0, 0.0, 0.0],
            ],
            dtype=np.float32,
        )

        corrected, crop_mask = bake_materials.apply_sidecar_correction(
            positions,
            {
                "axisFlips": [1, -1, -1],
                "centroidOffset": [100.0, 100.0, 100.0],
                "crop": {
                    "enabled": True,
                    "min": [-0.3, -0.1, -0.1],
                    "max": [0.3, 0.1, 0.1],
                },
            },
        )

        np.testing.assert_allclose(corrected, positions)
        np.testing.assert_array_equal(crop_mask, np.array([False, True, False]))

    def test_sidecar_corrected_normals_are_written_in_raw_asset_frame(self) -> None:
        bake_materials = load_bake_materials_module()
        normals = np.array(
            [
                [0.0, 0.0, 1.0],
                [0.0, 1.0, 0.0],
            ],
            dtype=np.float32,
        )

        raw = bake_materials.sidecar_corrected_normals_to_raw_frame(
            normals,
            {
                "axisFlips": [1, -1, -1],
                "orientation": {"rotation": [0.0, 0.0, 0.0]},
            },
        )

        np.testing.assert_allclose(
            raw,
            np.array(
                [
                    [0.0, 0.0, -1.0],
                    [0.0, -1.0, 0.0],
                ],
                dtype=np.float32,
            ),
            atol=1e-6,
        )


if __name__ == "__main__":
    unittest.main()
