import { describe, expect, it } from 'vitest';
import * as buggy from './buggy';
import * as fixed from './fixed';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

describe('07 async forEach: the bug (buggy.ts)', () => {
  it('reports 0 sent because forEach does not wait for async callbacks', async () => {
    const delivered: string[] = [];
    const send = async (id: string) => {
      await sleep(10);
      delivered.push(id);
    };
    const count = await buggy.notifyAll(['a', 'b', 'c'], send);
    expect(count).toBe(0); // returned before anything was sent
    expect(delivered).toEqual([]);
    await sleep(40); // ...the sends finish later, with nobody watching
    expect(delivered).toEqual(['a', 'b', 'c']);
  });

  it('a failing send becomes an unhandled rejection instead of an error for the caller', async () => {
    const unhandled: unknown[] = [];
    const onUnhandled = (reason: unknown) => unhandled.push(reason);
    process.on('unhandledRejection', onUnhandled);
    try {
      const send = async () => {
        throw new Error('smtp down');
      };
      await expect(buggy.notifyAll(['a'], send)).resolves.toBe(0); // caller never hears about it
      await sleep(20);
      expect(unhandled).toHaveLength(1);
    } finally {
      process.off('unhandledRejection', onUnhandled);
    }
  });

  it('uploadAll starts every upload at once', async () => {
    let inFlight = 0;
    let peak = 0;
    await buggy.uploadAll(
      Array.from({ length: 30 }, (_, i) => `f${i}`),
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await sleep(5);
        inFlight--;
      },
    );
    expect(peak).toBe(30);
  });
});

describe('07 async forEach: the fix (fixed.ts)', () => {
  it('waits for every send and reports the real count, in order', async () => {
    const delivered: string[] = [];
    const send = async (id: string) => {
      await sleep(5);
      delivered.push(id);
    };
    const count = await fixed.notifyAll(['a', 'b', 'c'], send);
    expect(count).toBe(3);
    expect(delivered).toEqual(['a', 'b', 'c']);
  });

  it('lets the caller handle a failure', async () => {
    const send = async () => {
      throw new Error('smtp down');
    };
    await expect(fixed.notifyAll(['a'], send)).rejects.toThrow('smtp down');
  });

  it('uploadAll never runs more than `concurrency` uploads at once and finishes them all', async () => {
    let inFlight = 0;
    let peak = 0;
    let done = 0;
    await fixed.uploadAll(
      Array.from({ length: 30 }, (_, i) => `f${i}`),
      async () => {
        inFlight++;
        peak = Math.max(peak, inFlight);
        await sleep(5);
        inFlight--;
        done++;
      },
      4,
    );
    expect(peak).toBeLessThanOrEqual(4);
    expect(peak).toBeGreaterThan(1); // still parallel, not one by one
    expect(done).toBe(30);
  });

  it('mapWithConcurrency keeps results in input order', async () => {
    const results = await fixed.mapWithConcurrency([30, 5, 15], 3, async (ms, index) => {
      await sleep(ms);
      return index;
    });
    expect(results).toEqual([0, 1, 2]);
  });

  it('mapWithConcurrency validates the limit and handles an empty list', async () => {
    await expect(fixed.mapWithConcurrency([1], 0, async (x) => x)).rejects.toThrow(RangeError);
    await expect(fixed.mapWithConcurrency([], 3, async (x) => x)).resolves.toEqual([]);
  });
});
