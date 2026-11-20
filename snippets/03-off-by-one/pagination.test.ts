import { describe, expect, it } from 'vitest';
import * as buggy from './buggy';
import * as fixed from './fixed';

const items = ['a', 'b', 'c', 'd', 'e', 'f', 'g']; // 7 items, pages of 3 -> [a b c] [d e f] [g]

describe('03 off-by-one: the bug (buggy.ts)', () => {
  it('page 1 skips the first page entirely (treats 1-based page as 0-based)', () => {
    expect(buggy.paginate(items, 1, 3)[0]).not.toBe('a');
  });

  it('returns one item too many (slice end is already exclusive)', () => {
    expect(buggy.paginate(items, 0, 3)).toHaveLength(4); // asked for 3
  });

  it('forgets the partly filled last page', () => {
    expect(buggy.totalPages(7, 3)).toBe(2); // should be 3, so item "g" is unreachable
  });

  it('drops the last moving-average window', () => {
    expect(buggy.movingAverage([1, 2, 3, 4], 2)).toEqual([1.5, 2.5]); // missing 3.5
  });
});

describe('03 off-by-one: the fix (fixed.ts)', () => {
  it('walks every item exactly once across all pages', () => {
    const pages = fixed.totalPages(items.length, 3);
    const seen = Array.from({ length: pages }, (_, i) => fixed.paginate(items, i + 1, 3)).flat();
    expect(seen).toEqual(items);
  });

  it('page 1 starts at the first item and has exactly pageSize items', () => {
    expect(fixed.paginate(items, 1, 3)).toEqual(['a', 'b', 'c']);
    expect(fixed.paginate(items, 3, 3)).toEqual(['g']);
  });

  it('handles the edges: empty list, exact multiple, page past the end', () => {
    expect(fixed.paginate([], 1, 3)).toEqual([]);
    expect(fixed.totalPages(0, 3)).toBe(0);
    expect(fixed.totalPages(6, 3)).toBe(2);
    expect(fixed.paginate(items, 99, 3)).toEqual([]);
  });

  it('rejects invalid arguments instead of silently returning garbage', () => {
    expect(() => fixed.paginate(items, 0, 3)).toThrow(RangeError);
    expect(() => fixed.paginate(items, 1, 0)).toThrow(RangeError);
    expect(() => fixed.totalPages(10, 0)).toThrow(RangeError);
    expect(() => fixed.movingAverage([1, 2], 0)).toThrow(RangeError);
  });

  it('moving average includes the last window', () => {
    expect(fixed.movingAverage([1, 2, 3, 4], 2)).toEqual([1.5, 2.5, 3.5]);
    expect(fixed.movingAverage([1, 2, 3], 3)).toEqual([2]);
    expect(fixed.movingAverage([1, 2], 3)).toEqual([]);
  });
});
