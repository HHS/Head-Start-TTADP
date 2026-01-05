import { recipientsWithoutTTA } from '../grantFilters';

describe('grantFilters', () => {
  describe('recipientsWithoutTTA', () => {
    it('handles query with dash (date range)', () => {
      const query = '2024/01/01-2024/12/31';
      const result = recipientsWithoutTTA.displayQuery(query);

      // Should format the date range
      expect(result).toContain('01/01/2024');
      expect(result).toContain('12/31/2024');
    });

    it('handles query without dash (single date)', () => {
      const query = '2024/01/15';
      const result = recipientsWithoutTTA.displayQuery(query);

      // Should format as MM/DD/YYYY
      expect(result).toBe('01/15/2024');
    });

    it('handles array query with dash', () => {
      const query = ['2024/01/01-2024/12/31'];
      const result = recipientsWithoutTTA.displayQuery(query);

      // Should format the date range
      expect(result).toContain('01/01/2024');
      expect(result).toContain('12/31/2024');
    });

    it('formats single date correctly', () => {
      const query = '2024/03/15';
      const result = recipientsWithoutTTA.displayQuery(query);

      // Single dates should be formatted as MM/DD/YYYY
      expect(result).toBe('03/15/2024');
    });
  });
});
