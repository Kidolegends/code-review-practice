import sqlite3

import pytest


@pytest.fixture
def conn():
    db = sqlite3.connect(":memory:")
    db.executescript(
        """
        CREATE TABLE orders (id INTEGER PRIMARY KEY, customer_id INTEGER, placed_at TEXT);
        CREATE TABLE order_items (
            id INTEGER PRIMARY KEY, order_id INTEGER, product TEXT, quantity INTEGER
        );
        """
    )
    for n in range(1, 21):  # 20 orders for customer 1, each with 2 items
        db.execute("INSERT INTO orders VALUES (?, 1, ?)", (n, f"2026-01-{n:02d}"))
        db.execute("INSERT INTO order_items (order_id, product, quantity) VALUES (?, 'pen', 1)", (n,))
        db.execute("INSERT INTO order_items (order_id, product, quantity) VALUES (?, 'ink', 2)", (n,))
    db.execute("INSERT INTO orders VALUES (100, 1, '2026-02-01')")  # an order with no items
    db.execute("INSERT INTO orders VALUES (200, 2, '2026-01-01')")  # another customer
    db.commit()
    yield db
    db.close()


def count_queries(conn, function, *args):
    """Run `function` and count the SQL statements it sends to the database."""
    statements = []
    conn.set_trace_callback(statements.append)
    try:
        result = function(*args)
    finally:
        conn.set_trace_callback(None)
    return result, len(statements)


def test_buggy_sends_one_query_per_order(conn, load_snippet):
    buggy = load_snippet("buggy")
    result, queries = count_queries(conn, buggy.list_orders_with_items, conn, 1)
    assert len(result) == 21
    assert queries == 1 + 21  # 1 for the list + 1 per order: grows with the data


def test_fixed_sends_a_single_query_no_matter_how_many_orders(conn, load_snippet):
    fixed = load_snippet("fixed")
    _, queries = count_queries(conn, fixed.list_orders_with_items, conn, 1)
    assert queries == 1

    for n in range(300, 400):  # 100 more orders: still one query
        conn.execute("INSERT INTO orders VALUES (?, 1, '2026-03-01')", (n,))
    _, queries_after = count_queries(conn, fixed.list_orders_with_items, conn, 1)
    assert queries_after == 1


def test_fixed_returns_exactly_the_same_data(conn, load_snippet):
    buggy = load_snippet("buggy")
    fixed = load_snippet("fixed")
    expected = buggy.list_orders_with_items(conn, 1)
    actual = fixed.list_orders_with_items(conn, 1)
    assert actual == expected


def test_fixed_keeps_orders_without_items_and_ignores_other_customers(conn, load_snippet):
    fixed = load_snippet("fixed")
    result = fixed.list_orders_with_items(conn, 1)
    empty = [o for o in result if o["id"] == 100]
    assert empty and empty[0]["items"] == []
    assert all(o["id"] != 200 for o in result)
    assert fixed.list_orders_with_items(conn, 999) == []
