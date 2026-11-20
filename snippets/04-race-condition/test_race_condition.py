import threading


def hammer(inventory, threads=50):
    """Start `threads` buyers at the same moment, each trying to reserve one unit."""
    barrier = threading.Barrier(threads)
    results = []
    lock = threading.Lock()

    def buyer():
        barrier.wait()  # everyone fires together
        ok = inventory.reserve(1)
        with lock:
            results.append(ok)

    workers = [threading.Thread(target=buyer) for _ in range(threads)]
    for w in workers:
        w.start()
    for w in workers:
        w.join()
    return results


def test_buggy_oversells_the_stock(load_snippet):
    inventory = load_snippet("buggy").Inventory(stock=10)
    results = hammer(inventory)
    assert sum(results) > 10  # sold more units than existed
    assert inventory.stock < 0  # and the stock went negative


def test_fixed_never_sells_more_than_the_stock(load_snippet):
    inventory = load_snippet("fixed").Inventory(stock=10)
    results = hammer(inventory)
    assert sum(results) == 10
    assert inventory.stock == 0


def test_fixed_still_works_in_a_single_thread(load_snippet):
    inventory = load_snippet("fixed").Inventory(stock=3)
    assert inventory.reserve(2) is True
    assert inventory.reserve(2) is False  # only 1 left
    assert inventory.reserve(1) is True
    assert inventory.stock == 0


def test_fixed_rejects_nonsense_quantities(load_snippet):
    import pytest

    inventory = load_snippet("fixed").Inventory(stock=3)
    with pytest.raises(ValueError):
        inventory.reserve(0)
    with pytest.raises(ValueError):
        inventory.reserve(-5)  # in the buggy version this would ADD stock
