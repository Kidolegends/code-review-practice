# Review 05: missing error handling around network calls and parsing

|              |                                                                                       |
| ------------ | ------------------------------------------------------------------------------------- |
| **Files**    | [`buggy.ts`](buggy.ts) → [`fixed.ts`](fixed.ts)                                       |
| **Category** | Reliability, error handling, input validation                                         |
| **Severity** | **High** (outages show up as confusing crashes; one bad record loses the whole batch) |
| **Proof**    | [`errors.test.ts`](errors.test.ts)                                                    |

## Summary

`fetchUser` never checks the HTTP status, never validates the response, and has no timeout. `loadUserNames` stops at the first failure. `parseSettings` throws a bare `SyntaxError` and accepts the wrong shape.

## Findings

| #   | Where                            | Issue                                                                                                                             | Severity |
| --- | -------------------------------- | --------------------------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `fetchUser`, `res.json()`        | `fetch` does **not** reject on 404 or 500. The error body is returned as if it were a `User` (the type says so, but it is a lie). | High     |
| 2   | `loadUserNames`                  | `user.name.toUpperCase()` crashes with "Cannot read properties of undefined", far from the real cause (a 404).                    | High     |
| 3   | `loadUserNames`, sequential loop | One failing id throws away every user that loaded fine. It is also slow (one request at a time).                                  | Medium   |
| 4   | `fetchUser`                      | No timeout: a hung connection hangs the caller forever.                                                                           | Medium   |
| 5   | `parseSettings`                  | A malformed file gives a bare `SyntaxError` with no context. `"42"` parses fine and is returned as "settings".                    | Medium   |

## Why it matters

When the API has a bad minute, this code does not fail in a clear way. It fails later, somewhere else, with a message that points at the wrong line. TypeScript types do not protect you here: `res.json()` returns `any`, and data from the network is untrusted.

## Suggested fix

1. Check `res.ok` and throw a **typed error** that carries the status.
2. Add a **timeout** with `AbortSignal.timeout`.
3. **Validate the shape** of the data before treating it as a `User`.
4. For batches, use `Promise.allSettled` and return both successes and failures, so the caller decides.
5. Wrap `JSON.parse` and give the error context. Check the parsed shape.

## Fixed code

```ts
export class HttpError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
    this.name = 'HttpError';
  }
}

export async function fetchUser(id: number, fetchImpl = fetch, timeoutMs = 5000): Promise<User> {
  const res = await fetchImpl(`https://api.example.com/users/${id}`, {
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!res.ok) throw new HttpError(res.status, `GET /users/${id} failed with status ${res.status}`);
  const body: unknown = await res.json().catch(() => {
    throw new Error(`GET /users/${id} returned a body that is not valid JSON`);
  });
  if (!isUser(body)) throw new Error(`GET /users/${id} returned an unexpected shape`);
  return body;
}

// Batch: keep the good ones, list the failures
const settled = await Promise.allSettled(ids.map((id) => fetchUser(id, fetchImpl)));
```

Full version: [`fixed.ts`](fixed.ts).

## How I would write it in the PR

> **[High] Errors are not handled in `fetchUser`.** `fetch` resolves on 404/500, so an error body is returned typed as `User`, and `loadUserNames` later crashes with "Cannot read properties of undefined". Please check `res.ok`, add a timeout, and validate the response shape. For the batch, `Promise.allSettled` keeps the users that loaded and reports the ones that failed. Tests cover 404, bad shape, non-JSON, timeout and partial failure.

## Proof

- Tests on `buggy.ts` show the 404 body returned as a user, the confusing `TypeError`, the lost batch and the bare `SyntaxError`.
- Tests on `fixed.ts` check `HttpError.status`, shape validation, non-JSON bodies, the timeout (using a fetch that never answers), partial results, and settings validation.
