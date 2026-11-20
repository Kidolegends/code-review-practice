# Review 04: check-then-act race condition in stock reservation

|              |                                                                 |
| ------------ | --------------------------------------------------------------- |
| **Files**    | [`buggy.py`](buggy.py) → [`fixed.py`](fixed.py)                 |
| **Category** | Concurrency                                                     |
| **Severity** | **High** (overselling, negative stock; happens only under load) |
| **Proof**    | [`test_race_condition.py`](test_race_condition.py)              |

## Summary

`reserve` checks `self.stock >= quantity` and then, a moment later, subtracts. Between the two steps another thread can do the same. With 10 units and 50 simultaneous buyers, many pass the check before any of them subtracts.

## Findings

| #   | Where                        | Issue                                                                                                 | Severity |
| --- | ---------------------------- | ----------------------------------------------------------------------------------------------------- | -------- |
| 1   | `reserve`, check then update | Classic time-of-check to time-of-use race. More units are sold than exist, and `stock` goes negative. | High     |
| 2   | `reserve`, no validation     | `quantity = -5` passes the check and **adds** stock.                                                  | Medium   |
| 3   | design                       | In-memory state only works inside one process. With several workers or servers, a lock does not help. | Medium   |

## Why it matters

The bug is invisible in local testing (one request at a time) and shows up on the busiest day, such as a sale. The `time.sleep` in the snippet stands in for a database call, which is exactly the kind of gap that makes this race likely in real code.

## Suggested fix

1. Make **check and update one atomic step**. In-process, use a lock around both.
2. If the stock lives in a database (the usual case), do it in **one statement** and look at the row count:
   `UPDATE products SET stock = stock - :q WHERE id = :id AND stock >= :q`. If 0 rows changed, there was not enough stock. This works across processes and servers.
3. Validate input (`quantity >= 1`).
4. Keep the critical section small: do slow work outside the lock when possible.

## Fixed code

```python
class Inventory:
    def __init__(self, stock: int):
        self.stock = stock
        self._lock = threading.Lock()

    def reserve(self, quantity: int = 1) -> bool:
        if quantity < 1:
            raise ValueError("quantity must be at least 1")
        with self._lock:  # check + update as ONE step
            if self.stock >= quantity:
                self.stock -= quantity
                return True
            return False
```

(The real file keeps the simulated delay inside the lock, to prove the lock is what protects it.) Full version: [`fixed.py`](fixed.py).

## How I would write it in the PR

> **[High] Race condition in `reserve`.** Check and decrement are separate steps, so concurrent requests can both pass the check. I reproduced it with 50 threads on stock 10: 50 reservations succeeded and stock ended negative. A lock fixes it in one process. If stock is in a database, prefer a single conditional `UPDATE ... WHERE stock >= :q` so it is safe across processes too. Also added a `quantity >= 1` check, since a negative quantity currently increases stock.

## Proof

- The test releases 50 threads at the same moment with a `Barrier`. On `buggy.py` it sells more than 10 units and ends below zero.
- On `fixed.py` exactly 10 succeed and stock ends at 0. Single-thread behavior and input validation are also tested.
