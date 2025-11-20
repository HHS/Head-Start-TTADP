import { startDateFilter, fixQueryWhetherStringOrArray } from '../trainingReportFilters';

describe('trainingReportFilters', () => {
  describe('startDateFilter', () => {
    it('handles range as array', () => {
      const query = ['2020/01/01', '2020/01/02'];
      expect(startDateFilter.displayQuery(query)).toBe('01/01/2020');
    });
    it('handles range as string', () => {
      const query = '2020/01/01-2020/01/02';
      expect(startDateFilter.displayQuery(query)).toBe('01/01/2020-01/02/2020');
    });

    it('handles single date', () => {
      const query = '2020/01/01';
      expect(startDateFilter.displayQuery(query)).toBe('01/01/2020');
    });

    it('handles single date as array', () => {
      const query = ['2020/01/01'];
      expect(startDateFilter.displayQuery(query)).toBe('01/01/2020');
    });
  });
  describe('fixQueryWhetherStringOrArray', () => {
    it('should return a string if the query is a string', () => {
      const query = '2020/01/01';
      expect(fixQueryWhetherStringOrArray(query)).toBe('2020/01/01');
    });

    it('should return a string if the query is an array', () => {
      const query = ['2020/01/01', '2020/01/02'];
      expect(fixQueryWhetherStringOrArray(query)).toBe('2020/01/01, 2020/01/02');
    });
  });
});
