"""Trim low-confidence splats from a PLY and recenter.

Removes splats below the opacity threshold (the model's own confidence signal),
recenters to the median of surviving splats. This is a destructive preprocessing
step that only removes genuine garbage — further non-destructive cropping should
use Kaminos sidecar crop bounds.

Usage:
    python trim_splats.py --ply input.ply --output trimmed.ply
    python trim_splats.py --ply input.ply --output trimmed.ply --opacity-threshold 0.1 --stats
"""

import argparse
import logging
from pathlib import Path

import numpy as np
from plyfile import PlyData, PlyElement

logging.basicConfig(level=logging.INFO, format="%(message)s")
LOG = logging.getLogger(__name__)


def sigmoid(x):
    return 1.0 / (1.0 + np.exp(-x))


def main():
    parser = argparse.ArgumentParser(description=__doc__,
                                      formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--ply", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    parser.add_argument("--opacity-threshold", type=float, default=0.05)
    parser.add_argument("--no-recenter", action="store_true")
    parser.add_argument("--stats", action="store_true")
    args = parser.parse_args()

    LOG.info(f"Loading: {args.ply}")
    plydata = PlyData.read(str(args.ply))
    verts = plydata["vertex"]
    N = len(verts.data)

    x = np.asarray(verts["x"])
    y = np.asarray(verts["y"])
    z = np.asarray(verts["z"])

    if "opacity" in verts.data.dtype.names:
        opacity = sigmoid(np.asarray(verts["opacity"]))
    else:
        opacity = np.ones(N)

    LOG.info(f"  {N} splats, opacity range: [{opacity.min():.4f}, {opacity.max():.4f}]")

    if args.stats:
        for t in [0.01, 0.02, 0.05, 0.1, 0.2, 0.5]:
            c = np.sum(opacity >= t)
            LOG.info(f"  opacity >= {t}: {c} ({100*c/N:.1f}%)")

    mask = opacity >= args.opacity_threshold
    kept = mask.sum()
    LOG.info(f"  Keeping {kept} ({100*kept/N:.1f}%), removing {N-kept}")

    if kept == 0:
        LOG.error("All splats removed! Lower the threshold.")
        return

    new_data = verts.data[mask]

    if not args.no_recenter:
        cx, cy, cz = np.median(x[mask]), np.median(y[mask]), np.median(z[mask])
        LOG.info(f"  Recentering from median ({cx:.3f}, {cy:.3f}, {cz:.3f})")
        modified = np.copy(new_data)
        modified["x"] = np.asarray(new_data["x"]) - cx
        modified["y"] = np.asarray(new_data["y"]) - cy
        modified["z"] = np.asarray(new_data["z"]) - cz
        new_data = modified

    new_vertex = PlyElement.describe(new_data, "vertex")
    other_elements = [el for el in plydata.elements if el.name != "vertex"]
    PlyData([new_vertex] + other_elements, text=False).write(str(args.output))
    LOG.info(f"Wrote: {args.output} ({kept} splats)")


if __name__ == "__main__":
    main()
