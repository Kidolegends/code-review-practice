// Small helpers used by a list screen. Pages are 1-based in the UI ("Page 1 of N").

function assertPositiveInteger(value: number, name: string): void {
  if (!Number.isInteger(value) || value < 1) {
    throw new RangeError(`${name} must be a positive integer, got ${value}`);
  }
}

/** Returns the items of a 1-based page. A page past the end returns an empty list. */
export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  assertPositiveInteger(page, 'page');
  assertPositiveInteger(pageSize, 'pageSize');
  const start = (page - 1) * pageSize; // page 1 starts at index 0
  return items.slice(start, start + pageSize); // slice's end is exclusive: no "+ 1"
}

export function totalPages(itemCount: number, pageSize: number): number {
  assertPositiveInteger(pageSize, 'pageSize');
  return Math.ceil(itemCount / pageSize); // a partly filled last page is still a page
}

// Moving average over a window of N values.
export function movingAverage(values: number[], window: number): number[] {
  assertPositiveInteger(window, 'window');
  const result: number[] = [];
  // The last window starts at index (length - window), so the bound is inclusive.
  for (let i = 0; i <= values.length - window; i++) {
    let sum = 0;
    for (let j = i; j < i + window; j++) {
      sum += values[j] ?? 0;
    }
    result.push(sum / window);
  }
  return result;
}
