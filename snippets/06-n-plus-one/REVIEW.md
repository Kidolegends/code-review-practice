# Review 06: N+1 queries on the order history page

|              |                                                                                |
| ------------ | ------------------------------------------------------------------------------ |
| **Files**    | [`buggy.py`](buggy.py) → [`fixed.py`](fixed.py)                                |
| **Category** | Performance, database access                                                   |
| **Severity** | **Medium** (fine with test data, slow in production; can become High at scale) |
| **Proof**    | [`test_n_plus_one.py`](test_n_plus_one.py)                                     |

## Summary

`list_orders_with_items` runs one query for the orders and then **one more query per order** for its items. For N orders that is N+1 round-trips.

## Findings

| #   | Where                  | Issue                                                                                       | Severity |
| --- | ---------------------- | ------------------------------------------------------------------------------------------- | -------- |
| 1   | loop over `orders`     | One query per order. 20 orders = 21 queries, 500 orders = 501. Latency grows with the data. | Medium   |
| 2   | no pagination or limit | A customer with a long history loads everything on every page view.                         | Low      |

## Why it matters

Locally the database is on the same machine and has 5 rows, so it feels instant. In production each query is a network round-trip (often 1 to 5 ms or more). 500 orders can turn one page view into seconds, and many users make it worse for everyone.

## Suggested fix

- Fetch everything in **one query** with a `JOIN` (use `LEFT JOIN` to keep orders that have no items), then group the rows in code.
- Alternative: two queries, the second with `WHERE order_id IN (...)`. That is constant (2) instead of N+1, and avoids duplicated order columns when orders have many items.
- In an ORM, use eager loading (`select_related` / `prefetch_related` in Django, `joinedload` / `selectinload` in SQLAlchemy, `include` in Prisma).
- Add pagination for large histories, and an index on `order_items(order_id)`.
- **Guard it with a test that counts queries**, so it cannot come back unnoticed.

## Fixed code

```python
def list_orders_with_items(conn, customer_id):
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
    # ... group rows by order id, keep SQL order, skip the NULL item of empty orders
```

Full version: [`fixed.py`](fixed.py).

## How I would write it in the PR

> **[Medium] N+1 query.** The loop runs one `SELECT` per order. With 20 orders that is 21 queries, and it grows with the data. Suggest a single `LEFT JOIN` and grouping in Python (or `WHERE order_id IN (...)`). I added a test that counts the SQL statements: the old code sends `1 + N`, the new code always sends 1, and both return identical data.

## Proof

- The test uses SQLite's trace callback to count statements. `buggy.py` sends 22 for 21 orders. `fixed.py` sends 1, and still sends 1 after 100 more orders are added.
- A second test checks that both versions return exactly the same data, including orders without items and other customers' orders being excluded.
