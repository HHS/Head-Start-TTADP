import {
  fixQueryWhetherStringOrArray,
  goalFilter,
  regionFilter,
  startDateFilter,
} from '../collabReportFilters';

describe('collabReportFilters', () => {
  describe('fixQueryWhetherStringOrArray', () => {
    it('joins array queries with comma-space', () => {
      expect(fixQueryWhetherStringOrArray(['a', 'b'])).toBe('a, b');
    });

    it('returns string queries as-is', () => {
      expect(fixQueryWhetherStringOrArray('hello')).toBe('hello');
    });
  });

  describe('startDateFilter.displayQuery', () => {
    it('formats a date-range string (contains "-")', () => {
      const result = startDateFilter.displayQuery('2024/01/01-2024/12/31');
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });

    it('formats a single date string (no "-")', () => {
      const result = startDateFilter.displayQuery('2024/01/15');
      expect(result).toMatch(/\d{2}\/\d{2}\/\d{4}/);
    });

    it('joins array input before processing', () => {
      const result = startDateFilter.displayQuery(['2024/01/01', '2024/12/31']);
      expect(typeof result).toBe('string');
      expect(result.length).toBeGreaterThan(0);
    });
  });

  describe('filter config shapes', () => {
    it('startDateFilter has correct id and display', () => {
      expect(startDateFilter.id).toBe('startDate');
      expect(startDateFilter.display).toBe('Date started');
    });

    it('regionFilter has correct id and display', () => {
      expect(regionFilter.id).toBe('region');
      expect(regionFilter.display).toBe('Region');
    });

    it('goalFilter has correct id and display', () => {
      expect(goalFilter.id).toBe('goal');
      expect(goalFilter.display).toBe('Supporting goals');
    });
  });
});
