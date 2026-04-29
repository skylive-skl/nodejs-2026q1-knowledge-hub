import { paginate, shouldPaginate, sortItems } from './pagination';

describe('pagination helpers', () => {
  describe('paginate', () => {
    it('uses defaults when page/limit are omitted', () => {
      const result = paginate([1, 2, 3]);

      expect(result).toEqual({
        total: 3,
        page: 1,
        limit: 10,
        data: [1, 2, 3],
      });
    });

    it('returns selected page slice', () => {
      const result = paginate([1, 2, 3, 4], 2, 2);

      expect(result.total).toBe(4);
      expect(result.page).toBe(2);
      expect(result.limit).toBe(2);
      expect(result.data).toEqual([3, 4]);
    });
  });

  describe('sortItems', () => {
    const items = [
      { name: 'Bob', score: 10 },
      { name: 'Alice', score: 20 },
      { name: 'Eve', score: null as number | null },
    ];

    it('returns copy when sortBy is missing or disallowed', () => {
      const withoutSortBy = sortItems(items, undefined, 'asc', ['name']);
      const disallowed = sortItems(items, 'unknown', 'asc', ['name']);

      expect(withoutSortBy).toEqual(items);
      expect(disallowed).toEqual(items);
      expect(withoutSortBy).not.toBe(items);
    });

    it('sorts strings and numbers in asc/desc order', () => {
      const byNameAsc = sortItems(items, 'name', 'asc', ['name']);
      const byScoreDesc = sortItems(items, 'score', 'desc', ['score']);

      expect(byNameAsc.map((item) => item.name)).toEqual(['Alice', 'Bob', 'Eve']);
      expect(byScoreDesc.map((item) => item.score)).toEqual([null, 20, 10]);
    });
  });

  describe('shouldPaginate', () => {
    it('returns false only when both values are undefined', () => {
      expect(shouldPaginate()).toBe(false);
      expect(shouldPaginate(1, undefined)).toBe(true);
      expect(shouldPaginate(undefined, 10)).toBe(true);
    });
  });
});
