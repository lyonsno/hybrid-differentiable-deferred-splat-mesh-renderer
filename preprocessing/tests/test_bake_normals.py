from __future__ import annotations

import importlib.util
import sys
import types
import unittest
from pathlib import Path

import numpy as np


def load_bake_normals_module():
    root = Path(__file__).resolve().parents[1]
    module_path = root / "splat_bake" / "bake_normals.py"

    sys.modules.setdefault("torch", types.SimpleNamespace())
    sys.modules.setdefault("plyfile", types.SimpleNamespace(PlyData=object, PlyElement=object))
    sys.modules.setdefault("PIL", types.SimpleNamespace(Image=object))
    sys.modules.setdefault("PIL.Image", object)

    spec = importlib.util.spec_from_file_location("bake_normals_under_test", module_path)
    assert spec is not None
    assert spec.loader is not None
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


class BakeNormalsTests(unittest.TestCase):
    def test_sampled_moge_normals_are_transformed_from_camera_space(self) -> None:
        bake_normals = load_bake_normals_module()
        normal_map = np.array([[[1.0, 0.0, 0.0]]], dtype=np.float32)
        uv = np.array([[0.0, 0.0]], dtype=np.float32)
        valid = np.array([True])

        normals = bake_normals.sample_normal_map(
            normal_map,
            uv,
            valid,
            cam_to_world_rot=np.eye(3, dtype=np.float32),
        )

        np.testing.assert_allclose(normals[0], [-1.0, 0.0, 0.0], atol=1e-6)

    def test_facing_camera_moge_normal_stays_forward_after_conversion(self) -> None:
        bake_normals = load_bake_normals_module()
        normal_map = np.array([[[0.0, 0.0, 1.0]]], dtype=np.float32)
        uv = np.array([[0.0, 0.0]], dtype=np.float32)
        valid = np.array([True])

        normals = bake_normals.sample_normal_map(
            normal_map,
            uv,
            valid,
            cam_to_world_rot=np.eye(3, dtype=np.float32),
        )

        np.testing.assert_allclose(normals[0], [0.0, 0.0, 1.0], atol=1e-6)


if __name__ == "__main__":
    unittest.main()
