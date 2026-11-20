import pytest


def test_buggy_tags_leak_between_calls(load_snippet):
    buggy = load_snippet("buggy")
    assert buggy.add_tag("python") == ["python"]
    assert buggy.add_tag("review") == ["python", "review"]  # "python" came from the previous call


def test_buggy_overrides_change_the_global_defaults(load_snippet):
    buggy = load_snippet("buggy")
    buggy.build_settings({"theme": "dark"})  # one user asks for dark mode...
    assert buggy.build_settings()["theme"] == "dark"  # ...and EVERY later user gets it
    assert buggy.DEFAULT_SETTINGS["theme"] == "dark"


def test_fixed_each_call_starts_fresh(load_snippet):
    fixed = load_snippet("fixed")
    assert fixed.add_tag("python") == ["python"]
    assert fixed.add_tag("review") == ["review"]


def test_fixed_does_not_mutate_the_callers_list(load_snippet):
    fixed = load_snippet("fixed")
    mine = ["a"]
    result = fixed.add_tag("b", mine)
    assert result == ["a", "b"]
    assert mine == ["a"]


def test_fixed_overrides_never_touch_the_defaults(load_snippet):
    fixed = load_snippet("fixed")
    dark = fixed.build_settings({"theme": "dark"})
    assert dark["theme"] == "dark"
    assert fixed.build_settings()["theme"] == "light"
    assert fixed.DEFAULT_SETTINGS["theme"] == "light"


def test_fixed_defaults_are_read_only(load_snippet):
    fixed = load_snippet("fixed")
    with pytest.raises(TypeError):
        fixed.DEFAULT_SETTINGS["theme"] = "dark"


def test_fixed_rejects_typos_in_setting_names(load_snippet):
    fixed = load_snippet("fixed")
    with pytest.raises(KeyError):
        fixed.build_settings({"them": "dark"})
