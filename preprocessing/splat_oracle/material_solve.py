"""Per-splat material solve — albedo, roughness, metalness constrained by semantic priors.

Takes corrected linear radiance + SAM3 material classes and solves for PBR parameters.
The semantic priors from SAM3 break the lighting-vs-material degeneracy that plagues
pure pixel-statistics approaches.
"""

from __future__ import annotations

import numpy as np

from splat_oracle.harvest import HarvestView
from splat_oracle.loader import SplatCloud
from splat_oracle.materials import MATERIAL_PRIORS, CLASS_NAMES


def _luminance(rgb: np.ndarray) -> np.ndarray:
    """Rec.709 luminance from linear RGB."""
    return 0.2126 * rgb[..., 0] + 0.7152 * rgb[..., 1] + 0.0722 * rgb[..., 2]


def solve_albedo(
    cloud: SplatCloud,
    corrected_colors: np.ndarray,
    views: list[HarvestView],
) -> np.ndarray:
    """Solve per-splat albedo from corrected radiance.

    For each splat, collect color samples across views. Use indirect-weighted
    ratio to estimate albedo. Constrain by material prior when available.

    Returns albedo (N, 3) in linear RGB.
    """
    N = cloud.num_points
    albedo = corrected_colors.copy()

    # Collect per-splat color samples across views
    color_sum = np.zeros((N, 3), dtype=np.float64)
    weight_sum = np.zeros(N, dtype=np.float64)

    for view in views:
        valid = (view.splat_id >= 0) & (view.weight > 0.01)
        if not valid.any():
            continue

        ids = view.splat_id[valid]
        # Use corrected per-splat colors, not raw view pixels
        colors = corrected_colors[ids]
        weights = view.weight[valid]

        np.add.at(color_sum, ids, colors * weights[:, None])
        np.add.at(weight_sum, ids, weights)

    # Weighted average color per splat
    has_samples = weight_sum > 0
    albedo[has_samples] = color_sum[has_samples] / weight_sum[has_samples, None]

    # Apply material prior constraints
    if cloud.material_class is not None and cloud.material_confidence is not None:
        for i in range(N):
            cls = cloud.material_class[i]
            conf = cloud.material_confidence[i]

            if cls == 0 or conf < 0.3:
                continue

            class_name = CLASS_NAMES.get(cls)
            if class_name is None:
                continue

            prior = MATERIAL_PRIORS.get(class_name)
            if prior is None:
                continue

            # Clamp albedo luminance to prior range
            lum = _luminance(albedo[i:i+1])[0]
            lo, hi = prior.albedo_range

            if lum < lo or lum > hi:
                # Scale to fit within range, weighted by confidence
                target = np.clip(lum, lo, hi)
                if lum > 0:
                    scale = target / lum
                    # Blend between unconstrained and constrained by confidence
                    blend = min(conf, 0.8)  # don't fully override even at high conf
                    albedo[i] = albedo[i] * (1 - blend) + albedo[i] * scale * blend

    return np.clip(albedo, 0, 1).astype(np.float32)


def solve_roughness(
    cloud: SplatCloud,
    views: list[HarvestView],
) -> np.ndarray:
    """Estimate per-splat roughness.

    High color variance across views → specular → low roughness.
    Low variance → diffuse → high roughness.
    Constrained by material priors.
    """
    N = cloud.num_points
    roughness = np.full(N, 0.75, dtype=np.float32)  # default: diffuse-leaning

    # Collect color variance per splat
    color_samples: list[list[np.ndarray]] = [[] for _ in range(N)]

    for view in views:
        valid = (view.splat_id >= 0) & (view.weight > 0.01)
        if not valid.any():
            continue

        ids = view.splat_id[valid]
        colors = view.color[valid]

        for sid, color in zip(ids, colors):
            if len(color_samples[sid]) < 20:
                color_samples[sid].append(color)

    for i in range(N):
        samples = color_samples[i]
        if len(samples) < 3:
            continue

        arr = np.array(samples)
        # Luminance variance as roughness proxy
        lums = _luminance(arr)
        # MAD-based robust spread
        mad = np.median(np.abs(lums - np.median(lums)))

        # High variance → specular → low roughness
        # Map: mad=0 → roughness=0.9, mad=0.3+ → roughness=0.1
        roughness[i] = np.clip(0.9 - mad * 2.5, 0.05, 0.95)

    # Apply material prior constraints
    if cloud.material_class is not None and cloud.material_confidence is not None:
        for i in range(N):
            cls = cloud.material_class[i]
            conf = cloud.material_confidence[i]

            if cls == 0 or conf < 0.3:
                continue

            class_name = CLASS_NAMES.get(cls)
            prior = MATERIAL_PRIORS.get(class_name) if class_name else None
            if prior is None:
                continue

            lo, hi = prior.roughness_range
            # Blend toward prior range by confidence
            target = np.clip(roughness[i], lo, hi)
            blend = min(conf, 0.7)
            roughness[i] = roughness[i] * (1 - blend) + target * blend

    return roughness


def solve_metalness(
    cloud: SplatCloud,
    albedo: np.ndarray,
    views: list[HarvestView],
) -> np.ndarray:
    """Estimate per-splat metalness.

    Metal: specular highlights tinted like albedo, low diffuse around highlights.
    Dielectric: specular highlights trend white/achromatic.

    Material priors resolve most cases directly.
    """
    N = cloud.num_points
    metalness = np.zeros(N, dtype=np.float32)  # default: dielectric

    # Material priors resolve most metalness directly
    if cloud.material_class is not None and cloud.material_confidence is not None:
        for i in range(N):
            cls = cloud.material_class[i]
            conf = cloud.material_confidence[i]

            if cls == 0 or conf < 0.3:
                continue

            class_name = CLASS_NAMES.get(cls)
            prior = MATERIAL_PRIORS.get(class_name) if class_name else None
            if prior is None:
                continue

            # Direct metalness from prior, weighted by confidence
            blend = min(conf, 0.8)
            metalness[i] = metalness[i] * (1 - blend) + prior.metalness * blend

    # Guardrails from architecture: dark + rough → clamp metalness ≤ 0.2
    dark = _luminance(albedo) < 0.1
    rough = np.zeros(N, dtype=bool)
    if cloud.roughness is not None:
        rough = cloud.roughness > 0.7
    metalness[dark & rough] = np.minimum(metalness[dark & rough], 0.2)

    return metalness


def solve_materials(
    cloud: SplatCloud,
    views: list[HarvestView],
    corrected_colors: np.ndarray | None = None,
) -> None:
    """Full material solve pipeline. Modifies cloud in-place.

    Sets cloud.albedo, cloud.roughness, cloud.metalness.
    """
    if corrected_colors is None:
        corrected_colors = cloud.colors

    cloud.albedo = solve_albedo(cloud, corrected_colors, views)
    cloud.roughness = solve_roughness(cloud, views)
    cloud.metalness = solve_metalness(cloud, cloud.albedo, views)
