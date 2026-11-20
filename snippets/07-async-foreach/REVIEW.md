# Review 07: `async` callback inside `forEach` (and unbounded concurrency)

|              |                                                                   |
| ------------ | ----------------------------------------------------------------- |
| **Files**    | [`buggy.ts`](buggy.ts) → [`fixed.ts`](fixed.ts)                   |
| **Category** | Async correctness, error propagation, resource usage              |
| **Severity** | **High** (work finishes after the caller moved on; errors vanish) |
| **Proof**    | [`async.test.ts`](async.test.ts)                                  |

## Summary

`notifyAll` uses `forEach(async ...)`. `forEach` ignores the promises its callback returns, so the function returns `0` immediately, while the sends are still running. `uploadAll` is correct about waiting, but starts every upload at once.

## Findings

| #   | Where                             | Issue                                                                                                                | Severity |
| --- | --------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `notifyAll`, `forEach(async ...)` | Not awaited. The function returns `sent === 0` before any send finishes. The result is wrong and is a timing bug.    | High     |
| 2   | `notifyAll`                       | A failing `send` becomes an **unhandled rejection** (can crash a Node process), and the caller never sees the error. | High     |
| 3   | `uploadAll`, `Promise.all(map)`   | 10,000 files start 10,000 requests at once: memory spikes, rate limits, socket exhaustion.                           | Medium   |

## Why it matters

Code after `await notifyAll(...)` assumes the notifications were sent. They were not, yet. Errors are lost, and tests that do not wait long enough pass by accident.

## Suggested fix

- Use `for...of` with `await` when the work must be **sequential and awaited**. Use `Promise.all(items.map(...))` for parallel work.
- For many items, **limit concurrency**: a small worker pool is enough, with no library needed.
- Let errors propagate to the caller (or collect them on purpose with `Promise.allSettled`).
- Lint rule: `@typescript-eslint/no-misused-promises` and `no-floating-promises` catch this class of bug.

## Fixed code

```ts
export async function notifyAll(userIds: string[], send: Send): Promise<number> {
  let sent = 0;
  for (const id of userIds) {
    await send(id); // for...of respects await. forEach does not.
    sent++;
  }
  return sent;
}

export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  const results = new Array<R>(items.length);
  let next = 0;
  async function runner(): Promise<void> {
    while (next < items.length) {
      const index = next++;
      results[index] = await worker(items[index] as T, index);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}
```

Full version: [`fixed.ts`](fixed.ts).

## How I would write it in the PR

> **[High] `forEach(async ...)` is not awaited.** `notifyAll` returns 0 right away and the sends finish later, and failures become unhandled rejections. Use a `for...of` loop with `await` (or `Promise.all(map)` if order does not matter). Separately, `uploadAll` starts every upload at once; a small concurrency limit avoids overloading the server. Tests show the 0 count, the unhandled rejection, the peak of 30 simultaneous uploads, and the fixed behavior.

## Proof

- Tests on `buggy.ts` show the count of `0`, the delayed deliveries, the unhandled rejection and a peak of 30 simultaneous uploads.
- Tests on `fixed.ts` show the real count, error propagation, a peak of at most 4 simultaneous uploads while still running in parallel, and result order.
