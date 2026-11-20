// Shopping cart totals. Prices are in dollars, as numbers.

export interface CartItem {
  name: string;
  price: number; // dollars, e.g. 19.99
  quantity: number;
}

export const TAX_RATE = 0.0825; // 8.25%

export function cartTotal(items: CartItem[], taxRate: number = TAX_RATE): number {
  let subtotal = 0;
  for (const item of items) {
    subtotal += item.price * item.quantity;
  }
  const tax = subtotal * taxRate;
  return subtotal + tax;
}

// Split a bill between friends.
export function splitBill(total: number, people: number): number[] {
  const share = total / people;
  return new Array<number>(people).fill(share);
}

export function formatPrice(amount: number): string {
  return '$' + amount.toFixed(2);
}
