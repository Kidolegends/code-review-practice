"""Small helpers from a settings and tagging module."""

DEFAULT_SETTINGS = {"theme": "light", "page_size": 20, "notifications": True}


def add_tag(tag, tags=[]):
    tags.append(tag)
    return tags


def build_settings(overrides=None):
    settings = DEFAULT_SETTINGS
    if overrides:
        settings.update(overrides)
    return settings
