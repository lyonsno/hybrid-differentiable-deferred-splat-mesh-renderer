from __future__ import annotations

from splat_oracle.cli import build_parser


def test_cli_exposes_inspect_command():
    parser = build_parser()
    args = parser.parse_args(["inspect", "scene.spz"])

    assert args.command == "inspect"
    assert str(args.input) == "scene.spz"
