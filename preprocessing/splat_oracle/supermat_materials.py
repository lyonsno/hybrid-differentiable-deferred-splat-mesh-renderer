"""SuperMat PBR material estimation for harvest views.

Runs SuperMat on each harvest view's color image to estimate roughness
and metallic maps, then projects results back to splats via the harvest
splat-ID buffer. Multi-view results are fused per-splat.
"""

from __future__ import annotations

import logging
import subprocess
import sys
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image

from splat_oracle.harvest import HarvestView
from splat_oracle.loader import SplatCloud

LOG = logging.getLogger(__name__)

SUPERMAT_DIR = Path("/tmp/SuperMat")
SUPERMAT_VENV = SUPERMAT_DIR / ".venv"
SUPERMAT_CHECKPOINT = SUPERMAT_DIR / "checkpoints" / "supermat.pth"
SUPERMAT_BASE_MODEL = "sd2-community/stable-diffusion-2-1"


def estimate_materials_for_view(
    view: HarvestView,
    device: str = "mps",
) -> tuple[np.ndarray, np.ndarray]:
    """Run SuperMat on a single harvest view, return roughness and metallic maps.

    Calls the SuperMat inference script as a subprocess (it has its own
    venv and model loading).

    Args:
        view: HarvestView with color image (H, W, 3) float32 in [0, 1].
        device: Device string for SuperMat.

    Returns:
        roughness: (H, W) float32 in [0, 1]
        metallic: (H, W) float32 in [0, 1]
    """
    if not SUPERMAT_DIR.exists():
        raise RuntimeError(f"SuperMat not found at {SUPERMAT_DIR}")

    with tempfile.TemporaryDirectory() as tmpdir:
        tmpdir = Path(tmpdir)

        # Save harvest view color as PNG for SuperMat input
        img = np.clip(view.color * 255, 0, 255).astype(np.uint8)
        input_path = tmpdir / "input.png"
        Image.fromarray(img).save(input_path)

        output_dir = tmpdir / "output"
        output_dir.mkdir()

        # Run SuperMat inference
        python = str(SUPERMAT_VENV / "bin" / "python")
        script = str(SUPERMAT_DIR / "inference_supermat.py")

        cmd = [
            python, script,
            "--input", str(input_path),
            "--output-dir", str(output_dir),
            "--checkpoint", str(SUPERMAT_CHECKPOINT),
            "--base-model", SUPERMAT_BASE_MODEL,
            "--device", device,
        ]

        LOG.info(f"Running SuperMat: {' '.join(cmd[-6:])}")
        result = subprocess.run(cmd, capture_output=True, text=True, timeout=120)

        if result.returncode != 0:
            LOG.error(f"SuperMat failed: {result.stderr[-500:]}")
            raise RuntimeError(f"SuperMat failed with exit code {result.returncode}")

        # SuperMat outputs: roughness.png, metallic.png in output_dir/input/
        result_dir = output_dir / "input"
        roughness_path = result_dir / "roughness.png"
        metallic_path = result_dir / "metallic.png"

        if not roughness_path.exists() or not metallic_path.exists():
            # Try without subdirectory
            roughness_path = output_dir / "roughness.png"
            metallic_path = output_dir / "metallic.png"

        if not roughness_path.exists():
            available = list(output_dir.rglob("*.png"))
            raise RuntimeError(f"SuperMat roughness.png not found. Available: {available}")

        roughness = np.array(Image.open(roughness_path).convert("L"), dtype=np.float32) / 255.0
        metallic = np.array(Image.open(metallic_path).convert("L"), dtype=np.float32) / 255.0

        # Resize to match harvest view dimensions if needed
        H, W = view.color.shape[:2]
        if roughness.shape != (H, W):
            roughness = np.array(Image.fromarray((roughness * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), dtype=np.float32) / 255.0
            metallic = np.array(Image.fromarray((metallic * 255).astype(np.uint8)).resize((W, H), Image.BILINEAR), dtype=np.float32) / 255.0

        return roughness, metallic


def bake_materials_from_views(
    cloud: SplatCloud,
    views: list[HarvestView],
    device: str = "mps",
) -> tuple[np.ndarray, np.ndarray]:
    """Estimate per-splat roughness and metallic from multiple harvest views using SuperMat.

    For each view:
    1. Run SuperMat to get per-pixel roughness/metallic maps
    2. Project back to splats via splat-ID buffer
    3. Average across views weighted by alpha contribution

    Args:
        cloud: SplatCloud with N splats.
        views: List of HarvestView objects.
        device: Device string for SuperMat.

    Returns:
        roughness: (N,) float32 per-splat roughness in [0, 1]
        metallic: (N,) float32 per-splat metallic in [0, 1]
    """
    N = cloud.num_points
    roughness_accum = np.zeros(N, dtype=np.float64)
    metallic_accum = np.zeros(N, dtype=np.float64)
    weight_accum = np.zeros(N, dtype=np.float64)

    for vi, view in enumerate(views):
        LOG.info(f"SuperMat material estimation: view {vi + 1}/{len(views)}")

        roughness_map, metallic_map = estimate_materials_for_view(view, device=device)

        splat_ids = view.splat_id
        valid_mask = splat_ids >= 0

        if not valid_mask.any():
            continue

        valid_ids = splat_ids[valid_mask]
        valid_roughness = roughness_map[valid_mask]
        valid_metallic = metallic_map[valid_mask]
        valid_weights = view.weight[valid_mask]

        np.add.at(roughness_accum, valid_ids, valid_roughness * valid_weights)
        np.add.at(metallic_accum, valid_ids, valid_metallic * valid_weights)
        np.add.at(weight_accum, valid_ids, valid_weights)

    has_material = weight_accum > 1e-8
    roughness = np.full(N, 0.5, dtype=np.float32)  # default roughness
    metallic = np.full(N, 0.0, dtype=np.float32)    # default dielectric

    roughness[has_material] = (roughness_accum[has_material] / weight_accum[has_material]).astype(np.float32)
    metallic[has_material] = (metallic_accum[has_material] / weight_accum[has_material]).astype(np.float32)

    # Clamp to valid range
    roughness = np.clip(roughness, 0.04, 1.0)
    metallic = np.clip(metallic, 0.0, 1.0)

    coverage = has_material.sum()
    LOG.info(f"SuperMat materials: {coverage}/{N} splats covered ({100 * coverage / N:.1f}%)")

    return roughness, metallic
