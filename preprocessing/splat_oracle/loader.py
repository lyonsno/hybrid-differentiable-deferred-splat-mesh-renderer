"""Load Gaussian splat data from SPZ and PLY files into numpy arrays."""

from __future__ import annotations

from dataclasses import dataclass, field
from pathlib import Path

import numpy as np


@dataclass
class SplatCloud:
    """Struct-of-arrays representation of a Gaussian splat scene.

    All arrays have shape (N, ...) where N = num_points.
    """

    positions: np.ndarray  # (N, 3) float32 — xyz
    colors: np.ndarray  # (N, 3) float32 — RGB linear [0,1]
    opacities: np.ndarray  # (N,) float32 — [0,1]
    scales: np.ndarray  # (N, 3) float32 — log-scale per axis
    rotations: np.ndarray  # (N, 4) float32 — quaternion (w,x,y,z)
    sh_coeffs: np.ndarray | None = None  # (N, C, 3) float32 — SH coefficients
    sh_degree: int = 0

    # Preprocessing outputs (populated later)
    material_class: np.ndarray | None = None  # (N,) int32 — semantic class index
    material_confidence: np.ndarray | None = None  # (N,) float32
    albedo: np.ndarray | None = None  # (N, 3) float32
    roughness: np.ndarray | None = None  # (N,) float32
    metalness: np.ndarray | None = None  # (N,) float32
    ghost_mask: np.ndarray | None = None  # (N,) bool — True = ghost splat

    @property
    def num_points(self) -> int:
        return self.positions.shape[0]

    @property
    def bbox_min(self) -> np.ndarray:
        return self.positions.min(axis=0)

    @property
    def bbox_max(self) -> np.ndarray:
        return self.positions.max(axis=0)

    @property
    def bbox_center(self) -> np.ndarray:
        return (self.bbox_min + self.bbox_max) / 2

    @property
    def bbox_size(self) -> np.ndarray:
        return self.bbox_max - self.bbox_min


def load_spz(path: str | Path) -> SplatCloud:
    """Load a .spz file into a SplatCloud."""
    from splat_oracle.spz_compat import GaussianSplat

    gs = GaussianSplat.load(str(path))

    positions = np.array(gs.positions, dtype=np.float32).reshape(-1, 3)
    # SPZ returns raw 3DGS parameters — convert to display space
    # Colors: SH DC coefficients -> linear RGB via sigmoid or SH_C0 transform
    raw_colors = np.array(gs.colors, dtype=np.float32).reshape(-1, 3)
    SH_C0 = 0.28209479177387814
    colors = np.clip(0.5 + SH_C0 * raw_colors, 0, 1)

    # Opacities: logit-space -> [0,1] via sigmoid
    raw_alpha = np.array(gs.alphas, dtype=np.float32).ravel()
    opacities = 1.0 / (1.0 + np.exp(-raw_alpha))

    # Scales: already log-space (used as-is by renderer, exp'd when needed)
    scales = np.array(gs.scales, dtype=np.float32).reshape(-1, 3)
    rotations = np.array(gs.rotations, dtype=np.float32).reshape(-1, 4)

    sh_coeffs = None
    sh_degree = gs.sh_degree
    if sh_degree > 0:
        raw_sh = np.array(gs.spherical_harmonics, dtype=np.float32)
        n_coeffs = (sh_degree + 1) ** 2 - 1  # exclude DC (already in colors)
        sh_coeffs = raw_sh.reshape(-1, n_coeffs, 3)

    return SplatCloud(
        positions=positions,
        colors=colors,
        opacities=opacities,
        scales=scales,
        rotations=rotations,
        sh_coeffs=sh_coeffs,
        sh_degree=sh_degree,
    )


def load_ply(path: str | Path) -> SplatCloud:
    """Load a Gaussian splat .ply file into a SplatCloud.

    Handles the 3DGS PLY format with f_dc_*, f_rest_*, scale_*, rot_* fields.
    """
    from plyfile import PlyData

    ply = PlyData.read(str(path))
    vertex = ply["vertex"]

    positions = np.stack(
        [vertex["x"], vertex["y"], vertex["z"]], axis=-1
    ).astype(np.float32)

    # DC color (SH band 0) — stored as f_dc_0, f_dc_1, f_dc_2
    if "f_dc_0" in vertex:
        dc = np.stack(
            [vertex["f_dc_0"], vertex["f_dc_1"], vertex["f_dc_2"]], axis=-1
        ).astype(np.float32)
        # SH DC to linear color: C = 0.5 + SH_C0 * dc where SH_C0 = 0.28209479
        colors = np.clip(0.5 + 0.28209479 * dc, 0, 1)
    elif "red" in vertex:
        colors = (
            np.stack(
                [vertex["red"], vertex["green"], vertex["blue"]], axis=-1
            ).astype(np.float32)
            / 255.0
        )
    else:
        colors = np.ones((len(vertex), 3), dtype=np.float32) * 0.5

    # PLY stores opacity as logit — apply sigmoid to get [0,1]
    if "opacity" in vertex:
        raw_opacity = vertex["opacity"].astype(np.float32)
        opacities = 1.0 / (1.0 + np.exp(-raw_opacity))
    else:
        opacities = np.ones(len(vertex), dtype=np.float32)

    # Scales
    if "scale_0" in vertex:
        scales = np.stack(
            [vertex["scale_0"], vertex["scale_1"], vertex["scale_2"]], axis=-1
        ).astype(np.float32)
    else:
        scales = np.zeros((len(vertex), 3), dtype=np.float32)

    # Rotations (quaternion)
    if "rot_0" in vertex:
        rotations = np.stack(
            [vertex["rot_0"], vertex["rot_1"], vertex["rot_2"], vertex["rot_3"]],
            axis=-1,
        ).astype(np.float32)
    else:
        rotations = np.tile(np.array([1, 0, 0, 0], dtype=np.float32), (len(vertex), 1))

    # SH coefficients (f_rest_*)
    sh_coeffs = None
    sh_degree = 0
    rest_names = sorted(
        [n for n in vertex.data.dtype.names if n.startswith("f_rest_")],
        key=lambda n: int(n.split("_")[-1]),
    )
    if rest_names:
        n_rest = len(rest_names)
        if n_rest % 3 != 0:
            raise ValueError(
                f"PLY f_rest_* field count must be divisible by 3 RGB channels, got {n_rest}"
            )
        n_coeffs = n_rest // 3
        sh_degree = int(np.sqrt(n_coeffs + 1)) - 1
        if (sh_degree + 1) ** 2 - 1 != n_coeffs:
            raise ValueError(
                f"PLY f_rest_* field count {n_rest} does not describe a complete SH degree"
            )
        raw = np.stack([vertex[n] for n in rest_names], axis=-1).astype(np.float32)
        sh_coeffs = raw.reshape(-1, 3, n_coeffs).transpose(0, 2, 1).copy()

    return SplatCloud(
        positions=positions,
        colors=colors,
        opacities=opacities,
        scales=scales,
        rotations=rotations,
        sh_coeffs=sh_coeffs,
        sh_degree=sh_degree,
    )


def load_splats(path: str | Path) -> SplatCloud:
    """Load splats from any supported format (auto-detect by extension)."""
    path = Path(path)
    ext = path.suffix.lower()
    if ext == ".spz":
        return load_spz(path)
    elif ext == ".ply":
        return load_ply(path)
    else:
        raise ValueError(f"Unsupported splat format: {ext} (expected .spz or .ply)")
