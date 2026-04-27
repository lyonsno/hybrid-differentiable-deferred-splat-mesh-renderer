"""CLI entry point for the splat oracle preprocessing pipeline."""

from __future__ import annotations

import argparse
import sys
import time
from pathlib import Path

import numpy as np


def main():
    parser = argparse.ArgumentParser(
        description="Splat Oracle — vision-model preprocessing for phone-scan material decomposition"
    )
    parser.add_argument("input", help="Input splat file (.spz or .ply)")
    parser.add_argument("-o", "--output", help="Output directory", default="./oracle_output")
    parser.add_argument("--width", type=int, default=768, help="Harvest view width")
    parser.add_argument("--height", type=int, default=768, help="Harvest view height")
    parser.add_argument("--no-ghost", action="store_true", help="Skip ghost detection")
    parser.add_argument("--no-tone-map", action="store_true", help="Skip inverse tone mapping")
    parser.add_argument("--vlm-model", default="Qwen3.6-35B-A3B-oQ8", help="VLM model ID")
    parser.add_argument("--vlm-url", default="http://localhost:8090", help="VLM server URL")
    parser.add_argument("--vlm-key", default="1234", help="VLM API key")
    args = parser.parse_args()

    output_dir = Path(args.output)
    output_dir.mkdir(parents=True, exist_ok=True)

    # 1. Load
    print(f"Loading {args.input}...")
    from splat_oracle.loader import load_splats
    cloud = load_splats(args.input)
    print(f"  {cloud.num_points} splats, SH degree {cloud.sh_degree}")

    # 2. Render harvest views
    print(f"Rendering harvest views ({args.width}x{args.height})...")
    t0 = time.time()
    from splat_oracle.harvest import render_harvest_views
    views = render_harvest_views(cloud, width=args.width, height=args.height)
    print(f"  {len(views)} views in {time.time()-t0:.1f}s")

    # Save harvest views
    from PIL import Image
    for i, v in enumerate(views):
        img = (np.clip(v.color, 0, 1) * 255).astype(np.uint8)
        Image.fromarray(img).save(output_dir / f"harvest_{i:02d}.png")

    # 3. Material segmentation
    print("Running SAM3 material segmentation...")
    t0 = time.time()
    from splat_oracle.segmentation import segment_scene
    seg_results = segment_scene(cloud, views)
    print(f"  Done in {time.time()-t0:.1f}s")

    # Report
    from splat_oracle.materials import CLASS_NAMES
    if cloud.material_class is not None:
        classes, counts = np.unique(cloud.material_class, return_counts=True)
        for cls, count in zip(classes, counts):
            name = CLASS_NAMES.get(cls, f"class_{cls}")
            pct = count / cloud.num_points * 100
            if pct > 0.5:
                print(f"    {name}: {count} splats ({pct:.1f}%)")

    # 4. Ghost detection
    if not args.no_ghost:
        print("Detecting ghost splats...")
        t0 = time.time()
        from splat_oracle.ghost import detect_ghosts
        regions = detect_ghosts(cloud, views)
        n_ghosts = cloud.ghost_mask.sum() if cloud.ghost_mask is not None else 0
        print(f"  {len(regions)} reflective regions, {n_ghosts} ghost splats in {time.time()-t0:.1f}s")

    # 5. Inverse tone mapping
    corrected_colors = cloud.colors
    if not args.no_tone_map:
        print("Running inverse tone mapping...")
        t0 = time.time()
        from splat_oracle.tone_mapping import inverse_tone_map_scene
        harvest_path = str(output_dir / "harvest_00.png")
        corrected_colors, lighting = inverse_tone_map_scene(
            cloud,
            harvest_image_path=harvest_path,
            vlm_model=args.vlm_model,
            server_url=args.vlm_url,
            api_key=args.vlm_key,
        )
        print(f"  Done in {time.time()-t0:.1f}s")
        if lighting:
            print(f"  Color temp: {lighting.estimated_color_temp_K}K")
            print(f"  Dynamic range: {lighting.dynamic_range_stops} stops")

    # 6. Material solve
    print("Solving materials...")
    t0 = time.time()
    from splat_oracle.material_solve import solve_materials
    solve_materials(cloud, views, corrected_colors=corrected_colors)
    print(f"  Done in {time.time()-t0:.1f}s")

    # 7. Save results
    print(f"Saving results to {output_dir}...")
    np.savez_compressed(
        output_dir / "oracle_output.npz",
        positions=cloud.positions,
        colors=cloud.colors,
        corrected_colors=corrected_colors,
        albedo=cloud.albedo,
        roughness=cloud.roughness,
        metalness=cloud.metalness,
        material_class=cloud.material_class,
        material_confidence=cloud.material_confidence,
        ghost_mask=cloud.ghost_mask if cloud.ghost_mask is not None else np.zeros(cloud.num_points, dtype=bool),
        opacities=cloud.opacities,
        scales=cloud.scales,
        rotations=cloud.rotations,
    )
    print("Done.")


if __name__ == "__main__":
    main()
