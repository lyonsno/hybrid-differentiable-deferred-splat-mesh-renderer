"""VLM-guided inverse tone mapping — recovers approximate linear radiance from phone camera output.

Phone cameras apply auto-exposure, local tone mapping (HDR+), white balance, and gamma.
Every pixel is a lie. This module uses a local VLM + material priors to recover
approximate linear radiance.

Pipeline:
  Pass 0: Naive render (raw splat colors = phone camera output)
  Pass 1: VLM scene read → structured lighting descriptor
  Pass 2: Constrained inverse tone map using material anchors
  Pass 3: Recursive refinement (re-render, re-query VLM, converge)
"""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from pathlib import Path

import numpy as np
from scipy.interpolate import PchipInterpolator

from splat_oracle.loader import SplatCloud
from splat_oracle.materials import MATERIAL_PRIORS, CLASS_NAMES


@dataclass
class SceneLightingDescriptor:
    """Structured output from VLM scene lighting read."""

    light_sources: list[dict] = field(default_factory=list)
    # Each: {"type": str, "direction": str, "relative_intensity": float, "color_temp_K": int}
    ambient_level: float = 0.2  # [0, 1] rough estimate
    dynamic_range_stops: float = 6.0
    clipped_highlights: list[str] = field(default_factory=list)
    crushed_shadows: list[str] = field(default_factory=list)
    estimated_color_temp_K: int = 5500
    notes: str = ""


VLM_SCENE_READ_PROMPT = """Analyze this rendered 3D scene for lighting characteristics. Output ONLY valid JSON with these fields:

{
  "light_sources": [{"type": "window/lamp/overhead/sun", "direction": "left/right/above/behind", "relative_intensity": 0.0-1.0, "color_temp_K": 2700-6500}],
  "ambient_level": 0.0-1.0,
  "dynamic_range_stops": 3.0-12.0,
  "clipped_highlights": ["description of any blown-out areas"],
  "crushed_shadows": ["description of any crushed-black areas"],
  "estimated_color_temp_K": 2700-6500,
  "notes": "any other observations about the lighting"
}"""

VLM_REFINEMENT_PROMPT = """Compare these two renders of the same scene. The first is the original phone camera output. The second has been corrected to approximate linear radiance.

Are the light sources the right relative brightness? Are shadows the right depth? Are any areas still obviously wrong?

Output ONLY valid JSON:
{
  "corrections_needed": true/false,
  "issues": ["description of remaining problems"],
  "brightness_adjustment": -1.0 to 1.0,
  "contrast_adjustment": -1.0 to 1.0
}"""


def query_vlm_scene_read(
    image_path: str,
    model_id: str = "Qwen3.6-35B-A3B-oQ8",
    server_url: str = "http://localhost:8090",
    api_key: str = "1234",
) -> SceneLightingDescriptor:
    """Query local VLM for scene lighting analysis."""
    import base64
    import urllib.request

    with open(image_path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode()

    payload = {
        "model": model_id,
        "messages": [
            {
                "role": "system",
                "content": "You analyze lighting in 3D rendered scenes. Output only valid JSON.",
            },
            {
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {"url": f"data:image/png;base64,{b64}"},
                    },
                    {"type": "text", "text": VLM_SCENE_READ_PROMPT},
                ],
            },
        ],
        "temperature": 0.3,
        "top_p": 0.95,
        "max_tokens": 500,
        "repetition_penalty": 1.0,
    }

    req = urllib.request.Request(
        f"{server_url}/v1/chat/completions",
        data=json.dumps(payload).encode(),
        headers={"Authorization": f"Bearer {api_key}", "Content-Type": "application/json"},
    )

    resp = urllib.request.urlopen(req, timeout=60)
    result = json.loads(resp.read())
    content = result["choices"][0]["message"]["content"]

    # Parse JSON from response (handle markdown code blocks)
    content = content.strip()
    if content.startswith("```"):
        content = content.split("\n", 1)[1]
        content = content.rsplit("```", 1)[0]

    try:
        data = json.loads(content)
    except json.JSONDecodeError:
        # Try to extract JSON from mixed text
        import re
        match = re.search(r"\{.*\}", content, re.DOTALL)
        if match:
            data = json.loads(match.group())
        else:
            return SceneLightingDescriptor(notes=f"VLM parse failed: {content[:200]}")

    return SceneLightingDescriptor(
        light_sources=data.get("light_sources", []),
        ambient_level=float(data.get("ambient_level", 0.2)),
        dynamic_range_stops=float(data.get("dynamic_range_stops", 6.0)),
        clipped_highlights=data.get("clipped_highlights", []),
        crushed_shadows=data.get("crushed_shadows", []),
        estimated_color_temp_K=int(data.get("estimated_color_temp_K", 5500)),
        notes=data.get("notes", ""),
    )


def collect_material_anchors(
    cloud: SplatCloud,
) -> list[tuple[float, float]]:
    """Collect (observed_luminance, expected_linear_luminance) anchor pairs
    from splats with known material classes.

    Known-reflectance surfaces (e.g., white painted ceiling → albedo ~0.8)
    serve as virtual gray cards that constrain the inverse tone map curve.
    """
    if cloud.material_class is None or cloud.material_confidence is None:
        return []

    anchors = []
    for i in range(cloud.num_points):
        cls = cloud.material_class[i]
        conf = cloud.material_confidence[i]

        if cls == 0 or conf < 0.5:
            continue

        class_name = CLASS_NAMES.get(cls)
        if class_name is None:
            continue

        prior = MATERIAL_PRIORS.get(class_name)
        if prior is None:
            continue

        # Observed luminance from splat color
        color = cloud.colors[i]
        observed_lum = 0.2126 * color[0] + 0.7152 * color[1] + 0.0722 * color[2]

        # Expected linear luminance from material prior (midpoint of albedo range)
        expected_lum = (prior.albedo_range[0] + prior.albedo_range[1]) / 2

        anchors.append((float(observed_lum), float(expected_lum)))

    return anchors


def fit_inverse_tone_curve(
    anchors: list[tuple[float, float]],
    lighting: SceneLightingDescriptor | None = None,
) -> PchipInterpolator:
    """Fit a monotonic spline mapping observed sRGB luminance → linear radiance.

    Uses material anchors as constraints. PCHIP guarantees monotonicity.
    """
    if not anchors:
        # Identity fallback
        return PchipInterpolator([0, 0.5, 1], [0, 0.5, 1])

    # Sort by observed luminance
    anchors = sorted(anchors, key=lambda x: x[0])

    # Deduplicate nearby observed values (bin by 0.02)
    binned: dict[int, list[float]] = {}
    for obs, exp in anchors:
        key = int(obs / 0.02)
        binned.setdefault(key, []).append(exp)

    obs_vals = []
    exp_vals = []
    for key in sorted(binned.keys()):
        obs_vals.append(key * 0.02 + 0.01)
        exp_vals.append(float(np.median(binned[key])))

    # Add boundary anchors
    if obs_vals[0] > 0.01:
        obs_vals.insert(0, 0.0)
        exp_vals.insert(0, 0.0)
    if obs_vals[-1] < 0.99:
        obs_vals.append(1.0)
        # Extrapolate from last anchor using dynamic range estimate
        if lighting and lighting.dynamic_range_stops > 0:
            exp_vals.append(min(exp_vals[-1] * 2, 1.0))
        else:
            exp_vals.append(exp_vals[-1])

    return PchipInterpolator(obs_vals, exp_vals)


def apply_inverse_tone_map(
    cloud: SplatCloud,
    curve: PchipInterpolator,
) -> np.ndarray:
    """Apply the inverse tone map curve to splat colors.

    Returns corrected colors (N, 3) in approximate linear radiance.
    Does NOT modify cloud in-place — returns the corrected array.
    """
    colors = cloud.colors.copy()

    # Apply per-channel (the curve is luminance-based but we apply uniformly)
    for c in range(3):
        colors[:, c] = np.clip(curve(colors[:, c]), 0, None)

    return colors


def inverse_tone_map_scene(
    cloud: SplatCloud,
    harvest_image_path: str | None = None,
    max_iterations: int = 3,
    vlm_model: str = "Qwen3.6-35B-A3B-oQ8",
    server_url: str = "http://localhost:8090",
    api_key: str = "1234",
) -> tuple[np.ndarray, SceneLightingDescriptor]:
    """Full inverse tone mapping pipeline.

    1. Collect material anchors from segmented splats
    2. Optionally query VLM for scene lighting descriptor
    3. Fit inverse tone curve constrained by anchors
    4. Apply to all splat colors

    Returns (corrected_colors, lighting_descriptor).
    """
    # Collect anchors from known materials
    anchors = collect_material_anchors(cloud)

    # Query VLM if we have a harvest image
    lighting = None
    if harvest_image_path:
        try:
            lighting = query_vlm_scene_read(
                harvest_image_path,
                model_id=vlm_model,
                server_url=server_url,
                api_key=api_key,
            )
        except Exception:
            lighting = SceneLightingDescriptor(notes="VLM query failed")

    # Fit curve
    curve = fit_inverse_tone_curve(anchors, lighting)

    # Apply
    corrected = apply_inverse_tone_map(cloud, curve)

    return corrected, lighting
