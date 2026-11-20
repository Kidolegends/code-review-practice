"""Stock reservation for a web shop. Called from many request threads at once."""

import time


class Inventory:
    def __init__(self, stock: int):
        self.stock = stock

    def reserve(self, quantity: int = 1) -> bool:
        if self.stock >= quantity:
            time.sleep(0.01)  # stands in for a database round-trip between the check and the update
            self.stock -= quantity
            return True
        return False
