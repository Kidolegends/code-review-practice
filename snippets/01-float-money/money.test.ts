import { describe, expect, it } from 'vitest';
import * as buggy from './buggy';
import * as fixed from './fixed';

describe('01 float money: the bug (buggy.ts)', () => {
  it('adds up prices with floating point noise', () => {
    const total = buggy.cartTotal(
      [
        { name: 'pen', price: 0.1, quantity: 1 },
        { name: 'clip', price: 0.2, quantity: 1 },
      ],
      0,
    );
    expect(total).not.toBe(0.3); // 0.30000000000000004
    expect(total).toBeCloseTo(0.3, 10); // close, but "close" is not good enough for money
  });

  it('accumulates error across many items so totals stop matching what the customer sees', () => {
    const items = Array.from({ length: 10 }, () => ({ name: 'x', price: 0.1, quantity: 1 }));
    expect(buggy.cartTotal(items, 0)).not.toBe(1); // 0.9999999999999999
  });

  it('loses a cent when splitting a bill', () => {
    const shares = buggy.splitBill(100, 3).map((s) => Number(s.toFixed(2)));
    const sum = shares.reduce((a, b) => a + b, 0);
    expect(shares).toEqual([33.33, 33.33, 33.33]);
    expect(Math.round(sum * 100)).toBe(9999); // somebody's cent vanished
  });
});

describe('01 float money: the fix (fixed.ts)', () => {
  it('adds cents exactly', () => {
    const total = fixed.cartTotalCents(
      [
        { name: 'pen', priceCents: 10, quantity: 1 },
        { name: 'clip', priceCents: 20, quantity: 1 },
      ],
      0,
    );
    expect(total).toBe(30);
  });

  it('stays exact over many items', () => {
    const items = Array.from({ length: 10 }, () => ({ name: 'x', priceCents: 10, quantity: 1 }));
    expect(fixed.cartTotalCents(items, 0)).toBe(100);
  });

  it('rounds tax once, to the nearest cent', () => {
    // 19.99 * 3 = 59.97, 8.25% tax = 4.947525 -> 4.95
    const total = fixed.cartTotalCents([{ name: 'shirt', priceCents: 1999, quantity: 3 }]);
    expect(total).toBe(5997 + 495);
  });

  it('split parts always add up to the total', () => {
    const shares = fixed.splitBillCents(10_000, 3);
    expect(shares).toEqual([3334, 3333, 3333]);
    for (const [total, people] of [
      [1, 3],
      [10_000, 7],
      [999, 2],
      [0, 4],
    ] as const) {
      const parts = fixed.splitBillCents(total, people);
      expect(parts.reduce((a, b) => a + b, 0)).toBe(total);
      expect(parts).toHaveLength(people);
    }
  });

  it('rejects values that are not integer cents', () => {
    expect(() => fixed.cartTotalCents([{ name: 'bad', priceCents: 19.99, quantity: 1 }])).toThrow(
      RangeError,
    );
    expect(() => fixed.splitBillCents(100, 0)).toThrow(RangeError);
  });

  it('formats cents without going through floats', () => {
    expect(fixed.formatCents(5)).toBe('$0.05');
    expect(fixed.formatCents(1999)).toBe('$19.99');
    expect(fixed.formatCents(100_000)).toBe('$1000.00');
  });
});
