"""Order history page: every order with its items."""

import sqlite3


def list_orders_with_items(conn: sqlite3.Connection, customer_id: int):
    orders = conn.execute(
        "SELECT id, placed_at FROM orders WHERE customer_id = ? ORDER BY placed_at", (customer_id,)
    ).fetchall()

    result = []
    for order_id, placed_at in orders:
        items = conn.execute(
            "SELECT product, quantity FROM order_items WHERE order_id = ?", (order_id,)
        ).fetchall()
        result.append({"id": order_id, "placed_at": placed_at, "items": items})
    return result
