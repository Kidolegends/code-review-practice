# Review 08: mutable default argument and shared global state

|              |                                                                               |
| ------------ | ----------------------------------------------------------------------------- |
| **Files**    | [`buggy.py`](buggy.py) → [`fixed.py`](fixed.py)                               |
| **Category** | Correctness, hidden shared state                                              |
| **Severity** | **Medium** (data leaks between requests or users; intermittent and confusing) |
| **Proof**    | [`test_mutable_default.py`](test_mutable_default.py)                          |

## Summary

`add_tag(tag, tags=[])` shares **one list** across all calls. `build_settings` assigns the global `DEFAULT_SETTINGS` dict to a local name and then updates it, so every override **permanently changes the defaults**.

## Findings

| #   | Where                                           | Issue                                                                                                        | Severity |
| --- | ----------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | -------- |
| 1   | `add_tag`, `tags=[]`                            | A default value is created once, when `def` runs. The list grows across calls, so tags leak between callers. | Medium   |
| 2   | `build_settings`, `settings = DEFAULT_SETTINGS` | This is an alias, not a copy. `update()` mutates the module-level defaults for everyone.                     | High     |
| 3   | `add_tag`                                       | Mutates the caller's list in place. Surprising for callers who still use their list.                         | Low      |
| 4   | `build_settings`                                | A typo like `"them"` is accepted silently and does nothing useful.                                           | Low      |

## Why it matters

In a web server these functions run for many users in one process. One user picking dark mode switches everybody to dark mode, until the process restarts. The bug depends on call order, so it is hard to reproduce.

## Suggested fix

- Use `None` as the default and create the object inside the function.
- **Copy** before you modify (`dict(DEFAULT_SETTINGS)`), or make the defaults read-only (`types.MappingProxyType`) so a bad write fails loudly.
- Prefer returning a new list over mutating the argument, unless mutation is the documented purpose.
- Validate keys so typos fail early.
- Lint: `flake8-bugbear` rule `B006` flags mutable defaults.

## Fixed code

```python
DEFAULT_SETTINGS = MappingProxyType({"theme": "light", "page_size": 20, "notifications": True})

def add_tag(tag, tags=None):
    if tags is None:
        tags = []
    return [*tags, tag]

def build_settings(overrides=None):
    settings = dict(DEFAULT_SETTINGS)  # a copy
    if overrides:
        unknown = set(overrides) - set(DEFAULT_SETTINGS)
        if unknown:
            raise KeyError(f"Unknown settings: {sorted(unknown)}")
        settings.update(overrides)
    return settings
```

Full version: [`fixed.py`](fixed.py).

## How I would write it in the PR

> **[Medium] Shared mutable state.** `tags=[]` is evaluated once, so tags leak between calls. And `settings = DEFAULT_SETTINGS` is an alias: `update()` changes the global defaults for every later caller. Use `None` as the default, copy the defaults, and consider `MappingProxyType` so accidental writes raise. Tests reproduce both leaks and cover the fix.

## Proof

- Tests on `buggy.py` show the tag from one call appearing in the next, and one user's `dark` theme becoming everyone's default.
- Tests on `fixed.py` show fresh state on every call, an untouched caller list, read-only defaults, and typo detection.
