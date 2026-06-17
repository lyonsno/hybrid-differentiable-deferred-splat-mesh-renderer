"""Directional coverage scoring for Gaussian splat scenes.

Implements the COVER algorithm (Cheng et al., CVPR 2026) for selecting
camera viewpoints that maximize scene coverage. Each Gaussian splat
tracks which directions it has been observed from using a discretized
unit-sphere histogram. Candidate views are scored by how much new
coverage they would add.

Reference: "COVER: Coverage Optimization for View Exploration and
Reconstruction" — github.com/chengine/nbv_gym (MIT license).

This is a standalone NumPy port of the core algorithm, independent of
PyTorch, gsplat, and nerfstudio. The frustum visibility test is
replaced by the harvest renderer's splat-ID buffer.
"""

from __future__ import annotations

import logging
import math

import numpy as np

from splat_oracle.camera import Camera
from splat_oracle.harvest import HarvestView

LOG = logging.getLogger(__name__)


def fibonacci_sphere(n_bins: int) -> np.ndarray:
    """Generate n_bins evenly-spaced directions on the unit sphere.

    Uses the Fibonacci lattice for quasi-uniform spacing.

    Args:
        n_bins: Number of directional bins (typically 32-128).

    Returns:
        bin_dirs: (G, 3) float32 unit vectors on S^2.
    """
    G = n_bins
    i = np.arange(G, dtype=np.float32)
    phi = (1.0 + math.sqrt(5.0)) / 2.0  # golden ratio
    z = 1.0 - 2.0 * (i + 0.5) / G
    r = np.sqrt(np.maximum(1.0 - z * z, 0.0))
    theta = 2.0 * math.pi * (i / phi % 1.0)
    x = r * np.cos(theta)
    y = r * np.sin(theta)
    return np.stack([x, y, z], axis=-1)


def dir_to_bin(bin_dirs: np.ndarray, view_dirs: np.ndarray) -> np.ndarray:
    """Assign each view direction to its nearest bin.

    Args:
        bin_dirs: (G, 3) unit vectors — bin centers on S^2.
        view_dirs: (N, 3) unit vectors — per-Gaussian view directions.

    Returns:
        bin_ids: (N,) int — index of the nearest bin for each direction.
    """
    dots = view_dirs @ bin_dirs.T  # (N, G)
    return np.argmax(dots, axis=-1)


class CoverageTracker:
    """Tracks directional observation coverage per Gaussian.

    Each Gaussian has a histogram of G bins on the unit sphere. When a
    Gaussian is observed from a camera, the bin closest to the
    camera-to-Gaussian direction is incremented.
    """

    def __init__(self, num_gaussians: int, n_bins: int = 64):
        """Initialize coverage tracking.

        Args:
            num_gaussians: Number of Gaussians (N).
            n_bins: Number of directional bins on the unit sphere (G).
        """
        self.N = num_gaussians
        self.G = n_bins
        self.bin_dirs = fibonacci_sphere(n_bins)  # (G, 3)
        self.coverage_counts = np.zeros((num_gaussians, n_bins), dtype=np.int32)
        self._views_added = 0

    def update_from_harvest_view(
        self,
        view: HarvestView,
        positions: np.ndarray,
    ):
        """Update coverage from a rendered harvest view.

        Uses the harvest renderer's splat-ID buffer to determine which
        Gaussians are visible, replacing the CUDA frustum test.

        Args:
            view: HarvestView with splat_id buffer.
            positions: (N, 3) Gaussian positions.
        """
        splat_ids = view.splat_id  # (H, W) int32
        valid_mask = splat_ids >= 0

        if not valid_mask.any():
            return

        # Get unique visible Gaussian IDs
        visible_ids = np.unique(splat_ids[valid_mask])

        # Camera position
        cam_pos = view.camera.position  # (3,)

        # Compute view directions from camera to each visible Gaussian
        visible_positions = positions[visible_ids]  # (M, 3)
        dirs = visible_positions - cam_pos[None, :]  # (M, 3)
        norms = np.linalg.norm(dirs, axis=1, keepdims=True)
        dirs = dirs / np.maximum(norms, 1e-10)

        # Bin each direction
        bin_ids = dir_to_bin(self.bin_dirs, dirs)  # (M,)

        # Increment coverage counts
        np.add.at(self.coverage_counts, (visible_ids, bin_ids), 1)

        self._views_added += 1

    def score_candidate_view(
        self,
        camera: Camera,
        positions: np.ndarray,
        visible_ids: np.ndarray | None = None,
    ) -> float:
        """Score a candidate camera viewpoint by expected coverage gain.

        For each Gaussian visible from this candidate, compute how well
        the candidate direction overlaps with already-observed directions.
        Low overlap = high new coverage = good candidate.

        Args:
            camera: Candidate camera.
            positions: (N, 3) Gaussian positions.
            visible_ids: (M,) indices of Gaussians visible from this camera.
                If None, scores all Gaussians (less accurate but faster).

        Returns:
            score: float — lower = more new coverage (better candidate).
                Returns the mean max-cosine-coverage over visible Gaussians.
        """
        if visible_ids is None:
            # Score all Gaussians (rough estimate)
            visible_ids = np.arange(self.N)

        if len(visible_ids) == 0:
            return 1.0  # worst possible score (nothing to see)

        cam_pos = camera.position
        visible_positions = positions[visible_ids]

        # Direction from camera to each Gaussian
        dirs = visible_positions - cam_pos[None, :]
        norms = np.linalg.norm(dirs, axis=1, keepdims=True)
        dirs = dirs / np.maximum(norms, 1e-10)

        # Cosine similarity with all bin directions
        cos_all = dirs @ self.bin_dirs.T  # (M, G)

        # Coverage metric: (cos + 1) / 2, masked by whether the bin has
        # any observations. Zero for unobserved bins.
        counts = self.coverage_counts[visible_ids]  # (M, G)
        observed = (counts > 0).astype(np.float32)
        coverage_metric = ((cos_all + 1.0) / 2.0) * observed

        # Max coverage per Gaussian — high means "already well covered from
        # a similar direction", low means "new direction"
        max_coverage = coverage_metric.max(axis=-1)  # (M,)

        return float(max_coverage.mean())

    def select_best_views(
        self,
        candidates: list[Camera],
        positions: np.ndarray,
        n_select: int,
        visible_ids_per_camera: list[np.ndarray] | None = None,
    ) -> list[int]:
        """Greedily select the best N views from candidates.

        At each step, selects the candidate with the lowest coverage
        score (most new information), adds it to the selected set,
        updates coverage, and continues.

        Args:
            candidates: List of candidate cameras.
            positions: (N, 3) Gaussian positions.
            n_select: Number of views to select.
            visible_ids_per_camera: Pre-computed visibility per camera.
                If None, scores all Gaussians for each candidate.

        Returns:
            selected: List of indices into candidates, in selection order.
        """
        selected = []
        remaining = list(range(len(candidates)))

        for step in range(min(n_select, len(candidates))):
            # Score all remaining candidates
            best_idx = -1
            best_score = float('inf')

            for idx in remaining:
                vis_ids = visible_ids_per_camera[idx] if visible_ids_per_camera else None
                score = self.score_candidate_view(candidates[idx], positions, vis_ids)
                if score < best_score:
                    best_score = score
                    best_idx = idx

            if best_idx < 0:
                break

            selected.append(best_idx)
            remaining.remove(best_idx)

            # Update coverage with the selected view
            # (Create a minimal HarvestView-like update using the visible IDs)
            cam = candidates[best_idx]
            cam_pos = cam.position
            vis_ids = visible_ids_per_camera[best_idx] if visible_ids_per_camera else np.arange(self.N)
            if len(vis_ids) > 0:
                dirs = positions[vis_ids] - cam_pos[None, :]
                norms = np.linalg.norm(dirs, axis=1, keepdims=True)
                dirs = dirs / np.maximum(norms, 1e-10)
                bin_ids = dir_to_bin(self.bin_dirs, dirs)
                np.add.at(self.coverage_counts, (vis_ids, bin_ids), 1)

            LOG.info(f"  Selected view {best_idx} (score={best_score:.4f}, "
                     f"step {step + 1}/{n_select})")

        return selected

    @property
    def per_gaussian_coverage(self) -> np.ndarray:
        """Fraction of bins observed per Gaussian. (N,) in [0, 1]."""
        return (self.coverage_counts > 0).mean(axis=1).astype(np.float32)

    @property
    def overall_coverage(self) -> float:
        """Mean coverage fraction across all Gaussians."""
        return float(self.per_gaussian_coverage.mean())

    def summary(self) -> dict:
        """Coverage summary statistics."""
        per_g = self.per_gaussian_coverage
        return {
            "num_gaussians": self.N,
            "num_bins": self.G,
            "views_added": self._views_added,
            "overall_coverage": float(per_g.mean()),
            "min_coverage": float(per_g.min()),
            "max_coverage": float(per_g.max()),
            "uncovered_count": int((per_g == 0).sum()),
            "well_covered_count": int((per_g > 0.25).sum()),
        }
