#!/usr/bin/env python3
"""Inject high-frequency detail from albedo into MoGE normal map.

MoGE provides correct macro surface orientation but smooths fine detail.
The albedo map preserves crisp edges, grooves, and surface texture that
MoGE misses. This script extracts intensity gradients from the albedo
and blends them as normal perturbations into the MoGE base normals.

Usage:
    python sharpen_normals.py \
        --normals moge_normals.png \
        --albedo albedo.png \
        --output sharpened_normals.png \
        --strength 1.0
"""
import argparse
import numpy as np
from PIL import Image


def sobel_to_normals(gray: np.ndarray, strength: float = 1.0) -> np.ndarray:
    """Convert grayscale image to tangent-space normal perturbation via Sobel.

    Returns (H, W, 3) normals in [-1, 1] range where (0, 0, 1) = no perturbation.
    """
    # Sobel kernels
    kx = np.array([[-1, 0, 1], [-2, 0, 2], [-1, 0, 1]], dtype=np.float32) / 8.0
    ky = np.array([[-1, -2, -1], [0, 0, 0], [1, 2, 1]], dtype=np.float32) / 8.0

    from scipy.ndimage import convolve
    dx = convolve(gray, kx) * strength
    dy = convolve(gray, ky) * strength

    # Normal from gradient: n = normalize(-dx, -dy, 1)
    nz = np.ones_like(dx)
    length = np.sqrt(dx * dx + dy * dy + nz * nz)
    normals = np.stack([-dx / length, -dy / length, nz / length], axis=-1)
    return normals


def blend_normals(base: np.ndarray, detail: np.ndarray) -> np.ndarray:
    """Blend detail normal perturbations into base normals.

    base: (H, W, 3) in [-1, 1] — MoGE normals
    detail: (H, W, 3) in [-1, 1] — Sobel-derived, where (0,0,1) = no perturbation

    Simply adds the XY perturbation from detail onto the base normal, then renormalizes.
    """
    # Detail perturbation: how far from (0,0,1) the detail normal is
    perturb_xy = detail[..., :2]  # xy offset from flat

    # Add perturbation to base normal's xy
    result = base.copy()
    result[..., 0] += perturb_xy[..., 0]
    result[..., 1] += perturb_xy[..., 1]

    # Renormalize
    length = np.sqrt(np.sum(result * result, axis=-1, keepdims=True))
    length = np.maximum(length, 1e-8)
    return result / length


def high_pass_gray(gray: np.ndarray, sigma: float = 10.0) -> np.ndarray:
    """Extract high-frequency detail by subtracting Gaussian blur."""
    from scipy.ndimage import gaussian_filter
    low = gaussian_filter(gray, sigma=sigma)
    return gray - low


def main():
    parser = argparse.ArgumentParser(description="Sharpen MoGE normals with albedo detail")
    parser.add_argument("--normals", required=True, help="MoGE normal map (PNG, RGB in [0,255] mapped from [-1,1])")
    parser.add_argument("--albedo", required=True, help="Albedo image (PNG)")
    parser.add_argument("--output", required=True, help="Output sharpened normal map (PNG)")
    parser.add_argument("--strength", type=float, default=1.5, help="Detail injection strength (default: 1.5)")
    parser.add_argument("--sigma", type=float, default=8.0, help="High-pass filter sigma in pixels (default: 8.0)")
    parser.add_argument("--output-npy", action="store_true", help="Also save float32 .npy")
    args = parser.parse_args()

    # Load MoGE normals: PNG [0,255] → [-1,1]
    normals_img = np.array(Image.open(args.normals).convert("RGB")).astype(np.float32)
    base_normals = normals_img / 255.0 * 2.0 - 1.0  # (H, W, 3) in [-1, 1]

    # Normalize (MoGE output may not be perfectly unit length after PNG quantization)
    length = np.sqrt(np.sum(base_normals * base_normals, axis=-1, keepdims=True))
    base_normals = base_normals / np.maximum(length, 1e-8)

    # Load albedo and convert to grayscale
    albedo = np.array(Image.open(args.albedo).convert("RGB")).astype(np.float32) / 255.0

    # Resize albedo to match normals if needed
    nh, nw = base_normals.shape[:2]
    ah, aw = albedo.shape[:2]
    if (ah, aw) != (nh, nw):
        albedo = np.array(Image.fromarray((albedo * 255).astype(np.uint8)).resize((nw, nh), Image.LANCZOS)).astype(np.float32) / 255.0
        print(f"Resized albedo from {aw}x{ah} to {nw}x{nh}")

    # Grayscale (luminance-weighted)
    gray = 0.2126 * albedo[..., 0] + 0.7152 * albedo[..., 1] + 0.0722 * albedo[..., 2]

    # High-pass filter to extract only fine detail (removes low-freq shading)
    detail_gray = high_pass_gray(gray, sigma=args.sigma)

    # Convert to normal perturbation
    detail_normals = sobel_to_normals(detail_gray, strength=args.strength)

    # Blend using Reoriented Normal Mapping
    result = blend_normals(base_normals, detail_normals)

    # Save as PNG [0,255]
    result_uint8 = ((result * 0.5 + 0.5) * 255).clip(0, 255).astype(np.uint8)
    Image.fromarray(result_uint8).save(args.output)
    print(f"Saved sharpened normals to {args.output} ({nw}x{nh})")
    print(f"  strength={args.strength}, sigma={args.sigma}")

    if args.output_npy:
        npy_path = args.output.rsplit(".", 1)[0] + ".npy"
        np.save(npy_path, result)
        print(f"  Also saved float32 to {npy_path}")


if __name__ == "__main__":
    main()
