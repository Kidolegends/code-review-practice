"""User lookup and search for an admin page."""

import sqlite3

# Identifiers (column names) cannot be bound as parameters, so we map user input to a fixed set.
SORTABLE_COLUMNS = {"username": "username", "id": "id", "email": "email"}


def _escape_like(term: str) -> str:
    """Make %, _ and \\ literal inside a LIKE pattern."""
    return term.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_")


def find_user(conn: sqlite3.Connection, username: str):
    # The value travels separately from the SQL text, so it can never become SQL.
    return conn.execute(
        "SELECT id, username, email FROM users WHERE username = ?", (username,)
    ).fetchone()


def search_users(conn: sqlite3.Connection, term: str, sort_by: str = "username"):
    if sort_by not in SORTABLE_COLUMNS:
        raise ValueError(f"Cannot sort by {sort_by!r}. Allowed: {sorted(SORTABLE_COLUMNS)}")
    column = SORTABLE_COLUMNS[sort_by]  # safe: comes from our own dict, not from the caller
    pattern = f"%{_escape_like(term)}%"
    return conn.execute(
        f"SELECT id, username FROM users WHERE username LIKE ? ESCAPE '\\' ORDER BY {column}",
        (pattern,),
    ).fetchall()
