# Review 02: SQL injection in a user search

|              |                                                                                           |
| ------------ | ----------------------------------------------------------------------------------------- |
| **Files**    | [`buggy.py`](buggy.py) → [`fixed.py`](fixed.py)                                           |
| **Category** | Security                                                                                  |
| **Severity** | **Critical** (data leak, authentication bypass, possible data loss, remotely exploitable) |
| **Proof**    | [`test_sql_injection.py`](test_sql_injection.py)                                          |

## Summary

Both functions build SQL by pasting user input into the query string (an f-string and string concatenation). An attacker controls part of the SQL.

## Findings

| #   | Where                                | Issue                                                                                                                       | Severity |
| --- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `find_user`, f-string                | `nobody' OR '1'='1` makes the `WHERE` always true and returns a real user. Same pattern in a login query is an auth bypass. | Critical |
| 2   | `search_users`, `term` concatenation | `%' UNION SELECT id, value FROM secrets --` returns rows from any table through the search box.                             | Critical |
| 3   | `search_users`, `sort_by`            | Identifiers go into `ORDER BY` unchecked, so any SQL expression runs. Parameters cannot fix this, it needs an allow-list.   | High     |
| 4   | `search_users`, `LIKE`               | `%` and `_` from the user act as wildcards. A search for `%` matches everyone.                                              | Low      |

## Why it matters

This is on the OWASP Top 10 for a reason. One text box can expose the whole database, and the fix is cheap. Also check how logs, error pages and other queries in the file are built: if one query is concatenated, others often are too.

## Suggested fix

1. **Bind values as parameters** (`?`). The driver sends the value separately from the SQL text, so it can never be parsed as SQL.
2. For **identifiers** (column names, sort direction), which cannot be bound, use an **allow-list** and map to your own constants. Reject anything else.
3. Escape `LIKE` wildcards when the user should search for literal text.
4. Give the application's database user the minimum privileges it needs.

## Fixed code

```python
SORTABLE_COLUMNS = {"username": "username", "id": "id", "email": "email"}

def find_user(conn, username):
    return conn.execute(
        "SELECT id, username, email FROM users WHERE username = ?", (username,)
    ).fetchone()

def search_users(conn, term, sort_by="username"):
    if sort_by not in SORTABLE_COLUMNS:
        raise ValueError(f"Cannot sort by {sort_by!r}")
    column = SORTABLE_COLUMNS[sort_by]  # from our dict, never from the caller
    pattern = f"%{_escape_like(term)}%"
    return conn.execute(
        f"SELECT id, username FROM users WHERE username LIKE ? ESCAPE '\\' ORDER BY {column}",
        (pattern,),
    ).fetchall()
```

Full version: [`fixed.py`](fixed.py).

## How I would write it in the PR

> **[Critical] SQL injection.** `find_user` and `search_users` build SQL with user input. I reproduced it: `nobody' OR '1'='1` returns a user, and a `UNION` in the search box returns rows from `secrets`. Please bind values with `?` and use an allow-list for `sort_by`. I added tests that reproduce both attacks against the old code and show they are harmless after the change. Worth checking the rest of the module for the same pattern.

## Proof

- Tests on `buggy.py` run the real attacks against an in-memory SQLite database (bypass, `UNION` leak, arbitrary `ORDER BY`).
- Tests on `fixed.py` show the same inputs are treated as plain text, unknown sort columns raise `ValueError`, and normal searching still works.
