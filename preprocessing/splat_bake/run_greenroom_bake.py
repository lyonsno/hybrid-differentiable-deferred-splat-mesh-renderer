"""Greenroom-compatible multi-view normal bake runner.

Renders orbit views of a splat PLY via headless Playwright, runs normal
estimation (Lotus-D or MoGE) on each view, projects normals back onto
splats in world space, and computes multi-view consensus.

This is a compound GPU pipeline: rendering (node/Playwright) + inference
(torch/MPS) + projection (numpy). The GPU-heavy part is N inference calls.

Requires a running dev server (default http://localhost:5174) serving the
renderer. The PLY path must be accessible to the dev server (relative to
the renderer project root, or in a served directory).

Usage (via Greenroom):
    gpu-greenroom submit multiview_bake <ply_path> -p views=6 normal_model=lotus

Manual (DO NOT run outside greenroom — blocked by sentinel):
    python run_greenroom_bake.py --ply input.ply --output-dir output/
"""
import argparse
import os
import sys
import time
import json


def main():
    parser = argparse.ArgumentParser(description="Multi-view normal bake for GPU Greenroom")
    parser.add_argument("--ply", required=True, help="Input splat PLY path")
    parser.add_argument("--output-dir", required=True, help="Output directory")
    parser.add_argument("--views", type=int, default=6, help="Number of orbit views")
    parser.add_argument("--normal-model", default="lotus", choices=["lotus", "moge"],
                        help="Normal estimation model")
    parser.add_argument("--distance", type=float, default=1.75, help="Camera distance")
    parser.add_argument("--azimuth-center", type=float, default=3.14159,
                        help="Center azimuth (default: pi = front)")
    parser.add_argument("--azimuth-spread", type=float, default=0.3,
                        help="Azimuth spread in radians")
    parser.add_argument("--elevation-spread", type=float, default=0.3,
                        help="Elevation spread in radians")
    parser.add_argument("--renderer-url", default="http://localhost:5174",
                        help="Running dev server URL")
    parser.add_argument("--device", default="mps", help="Torch device")
    args = parser.parse_args()

    os.makedirs(args.output_dir, exist_ok=True)

    # Tee stdout/stderr to log
    log_path = os.path.join(args.output_dir, "run.log")
    log_file = open(log_path, "w")

    class Tee:
        def __init__(self, *streams):
            self.streams = streams
        def write(self, data):
            for s in self.streams:
                s.write(data)
                s.flush()
        def flush(self):
            for s in self.streams:
                s.flush()

    sys.stdout = Tee(sys.__stdout__, log_file)
    sys.stderr = Tee(sys.__stderr__, log_file)

    # Write route report
    report = {
        "phase": "starting",
        "ply": args.ply,
        "views": args.views,
        "normal_model": args.normal_model,
        "distance": args.distance,
        "azimuth_center": args.azimuth_center,
        "azimuth_spread": args.azimuth_spread,
        "elevation_spread": args.elevation_spread,
        "renderer_url": args.renderer_url,
        "device": args.device,
    }
    report_path = os.path.join(args.output_dir, "route_report.json")
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    # Build the multiview_normals.py command
    script_dir = os.path.dirname(os.path.abspath(__file__))
    script = os.path.join(script_dir, "multiview_normals.py")

    output_ply = os.path.join(args.output_dir, "baked.ply")
    normal_maps_dir = os.path.join(args.output_dir, "normal_maps")

    # Use the Lotus venv for execution since it has torch + diffusers
    lotus_venv_python = os.path.expanduser("~/dev/Lotus/.venv/bin/python")

    cmd = [
        lotus_venv_python, "-u", script,
        "--ply", args.ply,
        "--output", output_ply,
        "--views", str(args.views),
        "--normal-model", args.normal_model,
        "--distance", str(args.distance),
        "--azimuth-center", str(args.azimuth_center),
        "--azimuth-spread", str(args.azimuth_spread),
        "--elevation-spread", str(args.elevation_spread),
        "--renderer-url", args.renderer_url,
        "--device", args.device,
        "--normal-maps-dir", normal_maps_dir,
    ]

    # Run from the renderer project root so PLY paths resolve for the dev server
    renderer_root = os.path.expanduser("~/dev/hybrid-differentiable-defferred-splat-mesh-renderer")

    print(f"[bake] PLY: {args.ply}")
    print(f"[bake] Model: {args.normal_model}")
    print(f"[bake] Views: {args.views}")
    print(f"[bake] Distance: {args.distance}")
    print(f"[bake] Output: {output_ply}")
    print(f"[bake] Running from: {renderer_root}")
    print(f"[bake] Command: {' '.join(cmd)}")

    t0 = time.time()
    import subprocess
    result = subprocess.run(cmd, cwd=renderer_root)
    elapsed = time.time() - t0

    report["phase"] = "done" if result.returncode == 0 else "failed"
    report["elapsed_s"] = elapsed
    report["exit_code"] = result.returncode
    report["output_ply"] = output_ply if result.returncode == 0 else None
    with open(report_path, "w") as f:
        json.dump(report, f, indent=2)

    print(f"[bake] {'Done' if result.returncode == 0 else 'FAILED'} in {elapsed:.1f}s")
    sys.exit(result.returncode)


if __name__ == "__main__":
    main()
