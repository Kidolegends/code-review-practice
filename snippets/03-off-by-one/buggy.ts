// Small helpers used by a list screen. Pages are 1-based in the UI ("Page 1 of N").

export function paginate<T>(items: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  const end = start + pageSize + 1;
  return items.slice(start, end);
}

export function totalPages(itemCount: number, pageSize: number): number {
  return Math.floor(itemCount / pageSize);
}

// Moving average over a window of N values.
export function movingAverage(values: number[], window: number): number[] {
  const result: number[] = [];
  for (let i = 0; i < values.length - window; i++) {
    let sum = 0;
    for (let j = i; j < i + window; j++) {
      sum += values[j] ?? 0;
    }
    result.push(sum / window);
  }
  return result;
}
