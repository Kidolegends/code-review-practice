# Review 03: off-by-one errors in pagination and a moving average

|              |                                                                                     |
| ------------ | ----------------------------------------------------------------------------------- |
| **Files**    | [`buggy.ts`](buggy.ts) → [`fixed.ts`](fixed.ts)                                     |
| **Category** | Correctness, boundary conditions                                                    |
| **Severity** | **Medium** (users cannot reach some data; no crash, so it can live for a long time) |
| **Proof**    | [`pagination.test.ts`](pagination.test.ts)                                          |

## Summary

Four small boundary mistakes in three helpers: 1-based pages used as 0-based, a `slice` end that is off by one, `floor` instead of `ceil`, and a loop bound that stops one iteration early.

## Findings

| #   | Where                                  | Issue                                                                                                     | Severity |
| --- | -------------------------------------- | --------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `paginate`, `start = page * pageSize`  | The UI is 1-based, so page 1 starts at index `pageSize` and the first items are never shown.              | Medium   |
| 2   | `paginate`, `start + pageSize + 1`     | `slice` already excludes its end. Each page returns one extra item (and it shows again on the next page). | Medium   |
| 3   | `totalPages`, `Math.floor`             | 7 items with page size 3 gives 2 pages. The 7th item cannot be reached.                                   | Medium   |
| 4   | `movingAverage`, `i < length - window` | The last window is never computed. For `[1,2,3,4]` and window 2, `3.5` is missing.                        | Medium   |
| 5   | all                                    | No validation: `pageSize = 0` divides by zero, `window = 0` returns nonsense.                             | Low      |

## Why it matters

Nothing crashes, so tests with "happy path" data pass. The bug only appears at boundaries: first page, last page, exact multiples, empty list.

## Suggested fix

- Convert the 1-based page explicitly: `start = (page - 1) * pageSize`.
- Remember that `slice(start, end)` excludes `end`: use `start + pageSize`.
- Use `Math.ceil` for the page count.
- The last window starts at `length - window`, so the loop bound is `<=`.
- Validate arguments and throw `RangeError` on invalid ones.
- Test the boundaries: empty, one item, exact multiple, one over, past the end.

## Fixed code

```ts
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  assertPositiveInteger(page, 'page');
  assertPositiveInteger(pageSize, 'pageSize');
  const start = (page - 1) * pageSize;
  return items.slice(start, start + pageSize);
}

export function totalPages(itemCount: number, pageSize: number): number {
  assertPositiveInteger(pageSize, 'pageSize');
  return Math.ceil(itemCount / pageSize);
}

export function movingAverage(values: number[], window: number): number[] {
  assertPositiveInteger(window, 'window');
  const result: number[] = [];
  for (let i = 0; i <= values.length - window; i++) {
    // ... sum values[i .. i + window - 1]
  }
  return result;
}
```

Full version: [`fixed.ts`](fixed.ts).

## How I would write it in the PR

> **[Medium] Off-by-one in `paginate` / `totalPages` / `movingAverage`.** With 7 items and page size 3, `totalPages` returns 2 (item 7 is unreachable), and page 1 starts at the second page. Also `slice(start, start + pageSize + 1)` returns 4 items per page. Details and fixes in the review file. I added tests that walk all pages and check that every item appears exactly once.

## Proof

- Tests on `buggy.ts` pin down each wrong behavior.
- Tests on `fixed.ts` walk every page and expect each item exactly once, and cover the edges (empty, exact multiple, past the end, invalid arguments, last window).
