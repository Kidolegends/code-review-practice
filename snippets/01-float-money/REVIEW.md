# Review 01: money stored as floating point

|              |                                                                     |
| ------------ | ------------------------------------------------------------------- |
| **Files**    | [`buggy.ts`](buggy.ts) → [`fixed.ts`](fixed.ts)                     |
| **Category** | Correctness, data types                                             |
| **Severity** | **High** (wrong amounts charged; silent, hard to notice in testing) |
| **Proof**    | [`money.test.ts`](money.test.ts)                                    |

## Summary

`cartTotal` and `splitBill` do money math with `number` (an IEEE 754 float). Many decimal values such as `0.1` cannot be stored exactly, so totals drift by tiny amounts, and splitting a bill loses cents.

## Findings

| #   | Where                        | Issue                                                                                                           | Severity |
| --- | ---------------------------- | --------------------------------------------------------------------------------------------------------------- | -------- |
| 1   | `cartTotal`, `price: number` | Prices are dollars as floats. `0.1 + 0.2 = 0.30000000000000004`; ten items of `0.10` give `0.9999999999999999`. | High     |
| 2   | `cartTotal`, tax line        | Tax is multiplied as a float and never rounded, so the total can have fractions of a cent.                      | High     |
| 3   | `splitBill`                  | `total / people` gives `33.333…`. Rounded to cents the shares add up to `99.99`, not `100.00`.                  | High     |
| 4   | all functions                | No input validation: negative, `NaN` or fractional-cent values go straight through.                             | Medium   |
| 5   | `formatPrice`                | `toFixed(2)` hides the drift in the UI, while the stored value stays wrong.                                     | Low      |

## Why it matters

Customers see `$0.30` but the system compares `0.30000000000000004 === 0.3` as false. Reconciliation with a payment provider, which always uses integer cents, fails by a cent here and there, and nobody can say why.

## Suggested fix

1. Represent money as an **integer number of the smallest unit** (cents). Convert only at the edges (input and display).
2. Express the tax rate as an integer too (basis points: `825` = 8.25%) and **round exactly once**, with a rule you chose.
3. When dividing money, distribute the remainder so that **the parts always sum to the total**.
4. Validate that amounts are safe, non-negative integers.

## Fixed code

```ts
export const TAX_RATE_BP = 825; // 8.25% in basis points

export function cartTotalCents(items: CartItem[], taxRateBp = TAX_RATE_BP): number {
  let subtotal = 0;
  for (const item of items) {
    assertCents(item.priceCents, `${item.name} price`);
    subtotal += item.priceCents * item.quantity; // integer * integer = exact
  }
  const tax = Math.round((subtotal * taxRateBp) / 10_000); // the only rounding
  return subtotal + tax;
}

export function splitBillCents(totalCents: number, people: number): number[] {
  const base = Math.floor(totalCents / people);
  const remainder = totalCents % people;
  return Array.from({ length: people }, (_, i) => base + (i < remainder ? 1 : 0));
}
```

Full version with validation and `formatCents`: [`fixed.ts`](fixed.ts).

## How I would write it in the PR

> **[High] Don't use `number` dollars for money.** `0.1 + 0.2` is `0.30000000000000004`, and `splitBill(100, 3)` loses a cent when rounded. Suggest integer cents for amounts and basis points for the tax rate, rounding once. For the split, give the remainder cents to the first people so the parts add up. I added tests for the drift and for the split (see `money.test.ts`).

## Proof

- Tests on `buggy.ts` show the drift (`0.30000000000000004`, `0.9999999999999999`) and the lost cent.
- Tests on `fixed.ts` show exact sums, a single rounding for tax, shares that always add up, and rejection of non-integer cents.
