"""Stock reservation for a web shop. Called from many request threads at once."""

import threading
import time


class Inventory:
    def __init__(self, stock: int):
        self.stock = stock
        self._lock = threading.Lock()

    def reserve(self, quantity: int = 1) -> bool:
        if quantity < 1:
            raise ValueError("quantity must be at least 1")
        # Check and update happen as ONE step: no other thread can slip in between them.
        with self._lock:
            if self.stock >= quantity:
                time.sleep(0.01)  # same simulated round-trip as before, now harmless
                self.stock -= quantity
                return True
            return False
