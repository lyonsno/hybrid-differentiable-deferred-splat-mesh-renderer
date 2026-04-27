from __future__ import annotations

import types

import pytest

from splat_oracle import spz_compat


def test_spz_binding_loads_native_extension_when_package_init_is_broken(monkeypatch, tmp_path):
    package_dir = tmp_path / "site-packages" / "spz"
    package_dir.mkdir(parents=True)
    native_path = package_dir / "spz.cpython-313-darwin.so"
    native_path.write_bytes(b"not a real extension; loader is monkeypatched")

    fake_native = types.SimpleNamespace(
        GaussianSplat=object(),
        CoordinateSystem=types.SimpleNamespace(UNSPECIFIED=object()),
        BoundingBox=object(),
        load=lambda path: path,
    )

    def broken_import(name):
        assert name == "spz"
        raise ImportError("cannot import name 'BoundingBox' from partially initialized module 'spz'")

    loaded_paths: list[str] = []

    def fake_extension_loader(path):
        loaded_paths.append(str(path))
        return fake_native

    monkeypatch.setattr(spz_compat.importlib, "import_module", broken_import)
    monkeypatch.setattr(spz_compat, "_load_extension_module", fake_extension_loader)
    monkeypatch.setattr(spz_compat, "_spz", None)
    monkeypatch.setattr(spz_compat.sys, "path", [str(tmp_path / "site-packages")])

    module = spz_compat.get_spz_module()

    assert module is fake_native
    assert loaded_paths == [str(native_path)]


def test_spz_binding_reports_actionable_install_error(monkeypatch):
    monkeypatch.setattr(spz_compat.importlib, "import_module", lambda name: (_ for _ in ()).throw(ImportError("broken")))
    monkeypatch.setattr(spz_compat, "_spz", None)
    monkeypatch.setattr(spz_compat.sys, "path", [])

    with pytest.raises(ImportError, match="Niantic SPZ native extension"):
        spz_compat.get_spz_module()
