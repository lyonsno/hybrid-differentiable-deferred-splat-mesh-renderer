"""Command line entry point for the preprocessing oracle."""

from __future__ import annotations

import argparse
import json
from pathlib import Path

from splat_oracle.loader import load_splats


def _inspect(args: argparse.Namespace) -> int:
    cloud = load_splats(args.input)
    payload = {
        "input": str(args.input),
        "num_points": cloud.num_points,
        "bbox_min": cloud.bbox_min.tolist(),
        "bbox_max": cloud.bbox_max.tolist(),
        "sh_degree": cloud.sh_degree,
    }
    print(json.dumps(payload, indent=2, sort_keys=True))
    return 0


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="splat-oracle",
        description="Vision-model oracle preprocessing for Gaussian splat scenes.",
    )
    subparsers = parser.add_subparsers(dest="command", required=True)

    inspect_parser = subparsers.add_parser("inspect", help="Load an SPZ/PLY scene and print stable metadata.")
    inspect_parser.add_argument("input", type=Path)
    inspect_parser.set_defaults(func=_inspect)

    return parser


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)
    return args.func(args)


if __name__ == "__main__":
    raise SystemExit(main())
