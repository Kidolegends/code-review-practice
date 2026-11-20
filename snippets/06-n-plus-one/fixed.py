"""Order history page: every order with its items."""

import sqlite3
from collections import defaultdict


def list_orders_with_items(conn: sqlite3.Connection, customer_id: int):
    # ONE query for everything. LEFT JOIN keeps orders that have no items yet.
    rows = conn.execute(
        """
        SELECT o.id, o.placed_at, i.product, i.quantity
        FROM orders AS o
        LEFT JOIN order_items AS i ON i.order_id = o.id
        WHERE o.customer_id = ?
        ORDER BY o.placed_at, o.id, i.id
        """,
        (customer_id,),
    ).fetchall()

    items_by_order = defaultdict(list)
    placed_at_by_order = {}
    order_ids = []  # keeps the SQL ordering
    for order_id, placed_at, product, quantity in rows:
        if order_id not in placed_at_by_order:
            placed_at_by_order[order_id] = placed_at
            order_ids.append(order_id)
        if product is not None:
            items_by_order[order_id].append((product, quantity))

    return [
        {"id": oid, "placed_at": placed_at_by_order[oid], "items": items_by_order[oid]}
        for oid in order_ids
    ]
