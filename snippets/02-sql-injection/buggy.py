"""User lookup and search for an admin page."""

import sqlite3


def find_user(conn: sqlite3.Connection, username: str):
    query = f"SELECT id, username, email FROM users WHERE username = '{username}'"
    return conn.execute(query).fetchone()


def search_users(conn: sqlite3.Connection, term: str, sort_by: str = "username"):
    query = (
        "SELECT id, username FROM users WHERE username LIKE '%" + term + "%' "
        "ORDER BY " + sort_by
    )
    return conn.execute(query).fetchall()
