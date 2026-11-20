import sqlite3

import pytest


@pytest.fixture
def conn():
    db = sqlite3.connect(":memory:")
    db.executescript(
        """
        CREATE TABLE users (id INTEGER PRIMARY KEY, username TEXT, email TEXT);
        CREATE TABLE secrets (id INTEGER PRIMARY KEY, value TEXT);
        INSERT INTO users VALUES (1, 'alice', 'alice@example.com'), (2, 'bob', 'bob@example.com');
        INSERT INTO secrets VALUES (1, 'api-key-123');
        """
    )
    yield db
    db.close()


# ---- the bug ----


def test_buggy_login_style_bypass_returns_a_user_for_a_name_that_does_not_exist(
    conn, load_snippet
):
    buggy = load_snippet("buggy")
    assert buggy.find_user(conn, "nobody") is None
    assert buggy.find_user(conn, "nobody' OR '1'='1") is not None  # injected condition is always true


def test_buggy_union_leaks_another_table(conn, load_snippet):
    buggy = load_snippet("buggy")
    rows = buggy.search_users(conn, "zzz%' UNION SELECT id, value FROM secrets --")
    assert (1, "api-key-123") in rows  # the secrets table came out through a search box


def test_buggy_accepts_any_sql_in_sort_by(conn, load_snippet):
    buggy = load_snippet("buggy")
    # It should have been rejected. Instead, arbitrary SQL runs.
    assert buggy.search_users(conn, "", sort_by="CASE WHEN 1 THEN username END DESC")[0][1] == "bob"


# ---- the fix ----


def test_fixed_treats_injection_text_as_a_plain_username(conn, load_snippet):
    fixed = load_snippet("fixed")
    assert fixed.find_user(conn, "nobody' OR '1'='1") is None
    assert fixed.find_user(conn, "alice") == (1, "alice", "alice@example.com")


def test_fixed_union_attempt_is_just_a_search_term(conn, load_snippet):
    fixed = load_snippet("fixed")
    assert fixed.search_users(conn, "zzz%' UNION SELECT id, value FROM secrets --") == []


def test_fixed_rejects_unknown_sort_columns(conn, load_snippet):
    fixed = load_snippet("fixed")
    with pytest.raises(ValueError):
        fixed.search_users(conn, "", sort_by="CASE WHEN 1 THEN username END DESC")
    with pytest.raises(ValueError):
        fixed.search_users(conn, "", sort_by="username; DROP TABLE users")


def test_fixed_sorting_and_searching_still_work(conn, load_snippet):
    fixed = load_snippet("fixed")
    assert [name for _, name in fixed.search_users(conn, "", sort_by="username")] == ["alice", "bob"]
    assert [name for _, name in fixed.search_users(conn, "o")] == ["bob"]


def test_fixed_like_wildcards_are_literal(conn, load_snippet):
    fixed = load_snippet("fixed")
    assert fixed.search_users(conn, "%") == []  # "%" is not "match everything" any more
