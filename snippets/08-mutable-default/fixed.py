"""Small helpers from a settings and tagging module."""

from types import MappingProxyType

# Read-only view: any accidental write raises TypeError instead of silently changing the defaults.
DEFAULT_SETTINGS = MappingProxyType({"theme": "light", "page_size": 20, "notifications": True})


def add_tag(tag, tags=None):
    # A default value is created ONCE, when `def` runs. `None` + a fresh list per call fixes that.
    if tags is None:
        tags = []
    return [*tags, tag]  # also stops us from mutating the caller's list behind their back


def build_settings(overrides=None):
    settings = dict(DEFAULT_SETTINGS)  # a copy, so the defaults stay untouched
    if overrides:
        unknown = set(overrides) - set(DEFAULT_SETTINGS)
        if unknown:
            raise KeyError(f"Unknown settings: {sorted(unknown)}")
        settings.update(overrides)
    return settings
