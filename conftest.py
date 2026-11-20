"""Shared pytest helper: load `buggy.py` / `fixed.py` from the snippet folder of a test file.

Snippet folders are named like `02-sql-injection`, which is not a valid Python package name,
so we load the modules by path instead of importing them.
"""

import importlib.util
from pathlib import Path

import pytest


@pytest.fixture
def load_snippet(request):
    folder = Path(request.module.__file__).parent

    def load(name: str):
        path = folder / f"{name}.py"
        spec = importlib.util.spec_from_file_location(f"{folder.name}_{name}".replace("-", "_"), path)
        module = importlib.util.module_from_spec(spec)
        spec.loader.exec_module(module)
        return module

    return load
