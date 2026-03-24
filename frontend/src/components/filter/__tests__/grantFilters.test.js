import { lastTTA } from '../grantFilters';

describe('grantFilters', () => {
  describe('lastTTA', () => {
    it('handles query with dash (date range)', () => {
      const query = '2024/01/01-2024/12/31';
      const result = lastTTA.displayQuery(query);

      // Should format the date range
      expect(result).toContain('01/01/2024');
      expect(result).toContain('12/31/2024');
    });

    it('handles query without dash (single date)', () => {
      const query = '2024/01/15';
      const result = lastTTA.displayQuery(query);

      // Should format as MM/DD/YYYY
      expect(result).toBe('01/15/2024');
    });

    it('handles array query with dash', () => {
      const query = ['2024/01/01-2024/12/31'];
      const result = lastTTA.displayQuery(query);

      // Should format the date range
      expect(result).toContain('01/01/2024');
      expect(result).toContain('12/31/2024');
    });

    it('formats single date correctly', () => {
      const query = '2024/03/15';
      const result = lastTTA.displayQuery(query);

      // Single dates should be formatted as MM/DD/YYYY
      expect(result).toBe('03/15/2024');
    });

    it('has correct filter configuration', () => {
      expect(lastTTA.id).toBe('lastTTA');
      expect(lastTTA.display).toBe('Last TTA');
      expect(lastTTA.conditions).toEqual([
        'is',
        'is on or after',
        'is on or before',
        'is within',
      ]);
    });

    it('has correct default values for all conditions', () => {
      expect(lastTTA.defaultValues).toHaveProperty('is');
      expect(lastTTA.defaultValues).toHaveProperty('is within');
      expect(lastTTA.defaultValues).toHaveProperty('is on or after');
      expect(lastTTA.defaultValues).toHaveProperty('is on or before');
      expect(lastTTA.defaultValues.is).toBeTruthy(); // Should have a default date range
      expect(lastTTA.defaultValues['is within']).toBe('');
      expect(lastTTA.defaultValues['is on or after']).toBe('');
      expect(lastTTA.defaultValues['is on or before']).toBe('');
    });
  });
});
