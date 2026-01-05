import { endDateFilter } from '../activityReportFilters';

describe('activityReportFilters', () => {
  describe('endDateFilter.displayQuery', () => {
    it('formats a date range when the query contains a hyphen', () => {
      const query = '2024/01/01-2024/01/31';
      expect(endDateFilter.displayQuery(query)).toBe('01/01/2024-01/31/2024');
    });

    it('formats a single date query without a hyphen', () => {
      const query = '2024/02/15';
      expect(endDateFilter.displayQuery(query)).toBe('02/15/2024');
    });
  });
});
