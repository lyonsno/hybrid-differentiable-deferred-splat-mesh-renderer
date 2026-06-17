"""MoGE normal estimation for harvest views.

Runs MoGE-2 vits-normal on each harvest view's color image, then
projects estimated normals back to splats via the harvest splat-ID buffer.
Multi-view results are fused per-splat using viewing-angle weighting.
"""

from __future__ import annotations

import logging
import sys

import numpy as np

from splat_oracle.harvest import HarvestView
from splat_oracle.loader import SplatCloud

LOG = logging.getLogger(__name__)

_moge_model = None


def _load_moge(device):
    """Load MoGE model (cached after first call)."""
    global _moge_model
    if _moge_model is not None:
        return _moge_model

    sys.path.insert(0, "/tmp/moge-standalone")
    import torch
    from moge.model.v2 import MoGeModel

    LOG.info("Loading MoGE-2 vits-normal...")
    _moge_model = MoGeModel.from_pretrained("Ruicheng/moge-2-vits-normal").to(device).eval()
    return _moge_model


def estimate_normals_for_view(
    view: HarvestView,
    device=None,
) -> np.ndarray:
    """Run MoGE on a single harvest view, return normal map.

    Args:
        view: HarvestView with color image (H, W, 3) float32 in [0, 1].
        device: torch device. Defaults to MPS if available.

    Returns:
        normal_map: (H, W, 3) float32 in [-1, 1], camera-space normals.
    """
    import torch

    if device is None:
        device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

    model = _load_moge(device)

    # Convert float32 [0,1] to uint8-range tensor [0,1] as model expects
    img = np.clip(view.color, 0, 1)
    img_tensor = torch.from_numpy(img.copy()).permute(2, 0, 1).unsqueeze(0).float().to(device)

    with torch.no_grad():
        output = model.infer(img_tensor)

    normals = output["normal"].cpu().numpy()[0]  # (H, W, 3) in [-1, 1]
    return normals


def _camera_view_direction(view: HarvestView) -> np.ndarray:
    """Get the forward direction of the camera (world space, unit vector)."""
    R = view.camera.view_matrix[:3, :3]
    # Camera looks along -Z in camera space, so forward = R^T @ [0, 0, -1]
    forward = -R.T @ np.array([0, 0, 1], dtype=np.float32)
    return forward / (np.linalg.norm(forward) + 1e-8)


def _camera_space_to_world_normals(
    normal_map: np.ndarray,
    view: HarvestView,
) -> np.ndarray:
    """Transform camera-space normals to world space.

    Args:
        normal_map: (H, W, 3) camera-space normals.
        view: HarvestView with camera extrinsics.

    Returns:
        (H, W, 3) world-space normals.
    """
    R = view.camera.view_matrix[:3, :3]  # world-to-camera rotation
    R_inv = R.T  # camera-to-world rotation

    H, W, _ = normal_map.shape
    flat = normal_map.reshape(-1, 3)  # (H*W, 3)
    world = (R_inv @ flat.T).T  # (H*W, 3)

    # Re-normalize
    norms = np.linalg.norm(world, axis=1, keepdims=True)
    world = world / np.maximum(norms, 1e-8)

    return world.reshape(H, W, 3)


def bake_normals_from_views(
    cloud: SplatCloud,
    views: list[HarvestView],
    device=None,
) -> np.ndarray:
    """Estimate per-splat normals from multiple harvest views using MoGE.

    For each view:
    1. Run MoGE to get per-pixel normals (camera space)
    2. Transform normals to world space
    3. Project back to splats via splat-ID buffer
    4. Weight by viewing angle (dot product of view direction and splat normal)

    Args:
        cloud: SplatCloud with N splats.
        views: List of HarvestView objects.
        device: torch device for MoGE.

    Returns:
        normals: (N, 3) float32 world-space unit normals per splat.
    """
    import torch

    if device is None:
        device = torch.device("mps" if torch.backends.mps.is_available() else "cpu")

    N = cloud.num_points
    # Accumulated weighted normals and weights per splat
    normal_accum = np.zeros((N, 3), dtype=np.float64)
    weight_accum = np.zeros(N, dtype=np.float64)

    for vi, view in enumerate(views):
        LOG.info(f"MoGE normal estimation: view {vi + 1}/{len(views)}")

        # Run MoGE
        normal_map = estimate_normals_for_view(view, device=device)

        # Transform from camera space to world space
        world_normals = _camera_space_to_world_normals(normal_map, view)

        # Get the splat-ID buffer from the harvest view
        splat_ids = view.splat_id  # (H, W) int32, -1 = no hit
        valid_mask = splat_ids >= 0

        if not valid_mask.any():
            continue

        # For each valid pixel, accumulate its normal to the corresponding splat
        valid_ids = splat_ids[valid_mask]  # (P,) splat indices
        valid_normals = world_normals[valid_mask]  # (P, 3)

        # Weight by alpha contribution from the harvest view
        valid_weights = view.weight[valid_mask]  # (P,) contribution weight

        # Viewing angle weight: prefer views where the splat faces the camera
        view_dir = _camera_view_direction(view)
        # Normal quality is better when surface faces the camera
        # Use abs(dot) to handle both front and back faces
        facing = np.abs(np.einsum('ij,j->i', valid_normals, view_dir))
        combined_weight = valid_weights * facing

        # Accumulate per-splat normals (weighted sum)
        np.add.at(normal_accum, valid_ids, valid_normals * combined_weight[:, None])
        np.add.at(weight_accum, valid_ids, combined_weight)

    # Normalize accumulated normals
    has_normal = weight_accum > 1e-8
    normals = np.zeros((N, 3), dtype=np.float32)
    normals[has_normal] = (normal_accum[has_normal] / weight_accum[has_normal, None]).astype(np.float32)

    # Re-normalize to unit length
    norms = np.linalg.norm(normals, axis=1, keepdims=True)
    norms = np.maximum(norms, 1e-8)
    normals = normals / norms

    # Default normal for splats with no coverage
    normals[~has_normal] = [0.0, -1.0, 0.0]

    coverage = has_normal.sum()
    LOG.info(f"MoGE normals: {coverage}/{N} splats covered ({100 * coverage / N:.1f}%)")

    return normals
