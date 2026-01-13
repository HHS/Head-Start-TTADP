import { endDateFilter, priorityIndicatorFilter } from '../activityReportFilters';

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

  describe('priorityIndicatorFilter', () => {
    it('has correct id and display name', () => {
      expect(priorityIndicatorFilter.id).toBe('priorityIndicator');
      expect(priorityIndicatorFilter.display).toBe('Priority indicator');
    });

    it('has correct default values for multi-select', () => {
      expect(priorityIndicatorFilter.defaultValues).toEqual({
        is: [],
        'is not': [],
      });
    });

    it('displays array query correctly', () => {
      const query = ['New recipient', 'FEI'];
      const result = priorityIndicatorFilter.displayQuery(query);
      expect(result).toBe('New recipient, FEI');
    });

    it('handles single value query', () => {
      const query = ['No TTA'];
      const result = priorityIndicatorFilter.displayQuery(query);
      expect(result).toBe('No TTA');
    });
  });
});
