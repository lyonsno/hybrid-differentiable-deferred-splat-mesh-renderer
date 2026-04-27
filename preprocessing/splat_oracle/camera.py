"""Camera utilities for harvest view generation."""

from __future__ import annotations

from dataclasses import dataclass

import numpy as np


@dataclass
class Camera:
    """Pinhole camera with extrinsics and intrinsics."""

    view_matrix: np.ndarray  # (4, 4) float32 — world-to-camera
    proj_matrix: np.ndarray  # (4, 4) float32 — camera-to-clip
    width: int
    height: int

    @property
    def viewproj(self) -> np.ndarray:
        return self.proj_matrix @ self.view_matrix

    @property
    def position(self) -> np.ndarray:
        """Camera world position."""
        R = self.view_matrix[:3, :3]
        t = self.view_matrix[:3, 3]
        return -R.T @ t


def look_at(eye: np.ndarray, target: np.ndarray, up: np.ndarray = None) -> np.ndarray:
    """Create a view matrix looking from eye to target."""
    if up is None:
        up = np.array([0, 1, 0], dtype=np.float32)
    eye = np.asarray(eye, dtype=np.float32)
    target = np.asarray(target, dtype=np.float32)
    up = np.asarray(up, dtype=np.float32)

    fwd = target - eye
    fwd = fwd / (np.linalg.norm(fwd) + 1e-8)
    right = np.cross(fwd, up)
    right = right / (np.linalg.norm(right) + 1e-8)
    true_up = np.cross(right, fwd)

    view = np.eye(4, dtype=np.float32)
    view[0, :3] = right
    view[1, :3] = true_up
    view[2, :3] = -fwd
    view[0, 3] = -np.dot(right, eye)
    view[1, 3] = -np.dot(true_up, eye)
    view[2, 3] = np.dot(fwd, eye)
    return view


def perspective(fov_y_deg: float, aspect: float, near: float, far: float) -> np.ndarray:
    """Create a perspective projection matrix."""
    fov_y = np.radians(fov_y_deg)
    f = 1.0 / np.tan(fov_y / 2)
    proj = np.zeros((4, 4), dtype=np.float32)
    proj[0, 0] = f / aspect
    proj[1, 1] = f
    proj[2, 2] = (far + near) / (near - far)
    proj[2, 3] = (2 * far * near) / (near - far)
    proj[3, 2] = -1
    return proj


def generate_harvest_cameras(
    center: np.ndarray,
    radius: float,
    width: int = 512,
    height: int = 512,
    fov_y_deg: float = 60.0,
) -> list[Camera]:
    """Generate 16+ harvest view cameras around a scene center.

    Layout:
    - 6 axis-aligned cube faces
    - 8 corners (looking inward at 45-degree diagonals)
    - 2 top/bottom diagonals
    """
    center = np.asarray(center, dtype=np.float32)
    near = radius * 0.01
    far = radius * 10.0
    aspect = width / height
    proj = perspective(fov_y_deg, aspect, near, far)

    cameras = []

    def _add(eye_offset, up=None):
        eye = center + np.array(eye_offset, dtype=np.float32) * radius
        view = look_at(eye, center, up)
        cameras.append(Camera(view_matrix=view, proj_matrix=proj, width=width, height=height))

    # 6 axis-aligned faces
    _add([1, 0, 0])
    _add([-1, 0, 0])
    _add([0, 1, 0], up=np.array([0, 0, -1], dtype=np.float32))
    _add([0, -1, 0], up=np.array([0, 0, 1], dtype=np.float32))
    _add([0, 0, 1])
    _add([0, 0, -1])

    # 8 corners
    s = 1.0 / np.sqrt(3)
    for sx in [-1, 1]:
        for sy in [-1, 1]:
            for sz in [-1, 1]:
                _add([sx * s, sy * s, sz * s])

    # 2 extra diagonals (elevated views)
    _add([0.5, 0.866, 0.5])
    _add([-0.5, 0.866, -0.5])

    return cameras
