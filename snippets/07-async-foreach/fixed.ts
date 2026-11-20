// Sends a notification to every user, then reports how many were sent.

type Send = (userId: string) => Promise<void>;

/** Sends one by one, in order, and only returns when every send has finished. */
export async function notifyAll(userIds: string[], send: Send): Promise<number> {
  let sent = 0;
  for (const id of userIds) {
    await send(id); // for...of respects await. forEach does not.
    sent++;
  }
  return sent;
}

/**
 * Runs `worker` over `items` with at most `limit` running at the same time.
 * Rejects with the first error (workers already running are allowed to finish).
 */
export async function mapWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T, index: number) => Promise<R>,
): Promise<R[]> {
  if (!Number.isInteger(limit) || limit < 1) {
    throw new RangeError('limit must be a positive integer');
  }
  const results = new Array<R>(items.length);
  let next = 0;

  async function runner(): Promise<void> {
    while (next < items.length) {
      const index = next++; // safe: JavaScript runs this line without interruption
      results[index] = await worker(items[index] as T, index);
    }
  }

  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, () => runner()));
  return results;
}

export async function uploadAll(
  files: string[],
  upload: (file: string) => Promise<void>,
  concurrency = 5,
): Promise<void> {
  await mapWithConcurrency(files, concurrency, (file) => upload(file));
}
