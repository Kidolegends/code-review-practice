// Shopping cart totals. Money is an integer number of cents. Never a float.

export interface CartItem {
  name: string;
  priceCents: number; // integer cents, e.g. 1999
  quantity: number;
}

/** 8.25% expressed in basis points (1 bp = 0.01%), so the rate is an integer too. */
export const TAX_RATE_BP = 825;

function assertCents(value: number, label: string): void {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new RangeError(`${label} must be a non-negative integer number of cents, got ${value}`);
  }
}

export function cartTotalCents(items: CartItem[], taxRateBp: number = TAX_RATE_BP): number {
  let subtotal = 0;
  for (const item of items) {
    assertCents(item.priceCents, `${item.name} price`);
    if (!Number.isInteger(item.quantity) || item.quantity < 0) {
      throw new RangeError(`${item.name} quantity must be a non-negative integer`);
    }
    subtotal += item.priceCents * item.quantity; // integer * integer = exact
  }
  // The only rounding in the whole calculation, done once, on purpose, in a known direction.
  const tax = Math.round((subtotal * taxRateBp) / 10_000);
  return subtotal + tax;
}

/** Splits cents so that the parts always add up to the total. The first people pay the extra cents. */
export function splitBillCents(totalCents: number, people: number): number[] {
  assertCents(totalCents, 'total');
  if (!Number.isInteger(people) || people < 1) {
    throw new RangeError('people must be a positive integer');
  }
  const base = Math.floor(totalCents / people);
  const remainder = totalCents % people;
  return Array.from({ length: people }, (_, i) => base + (i < remainder ? 1 : 0));
}

export function formatCents(cents: number): string {
  assertCents(cents, 'amount');
  const dollars = Math.floor(cents / 100);
  const rest = String(cents % 100).padStart(2, '0');
  return `$${dollars}.${rest}`;
}
