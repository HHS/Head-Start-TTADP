import {
  ensureArray,
  formatDate,
  uniqueStrings,
} from './utils';

describe('utils', () => {
  describe('uniqueStrings', () => {
    it('returns an array of unique, non-null, and non-undefined strings', () => {
      const input = ['a', 'b', 'c', 'a', null, undefined, ''];
      const result = uniqueStrings(input);
      expect(result).toEqual(['a', 'b', 'c']);
    });

    it('returns an empty array when input is empty', () => {
      const input = [];
      const result = uniqueStrings(input);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input contains only null and undefined values', () => {
      const input = [null, undefined, null];
      const result = uniqueStrings(input);
      expect(result).toEqual([]);
    });
  });

  describe('formatDate', () => {
    it('returns null for undefined input', () => {
      expect(formatDate(undefined)).toBeNull();
    });

    it('returns null for null input', () => {
      expect(formatDate(null)).toBeNull();
    });

    it('returns null for invalid date string', () => {
      expect(formatDate('invalid-date')).toBeNull();
    });

    it('returns formatted date string for valid date input', () => {
      expect(formatDate('2024-01-01')).toBe('01/01/2024');
    });
  });
  describe('ensureArray', () => {
    it('returns the same array when input is an array', () => {
      const input = ['a', 'b', 'c'];
      const result = ensureArray(input);
      expect(result).toEqual(input);
    });

    it('returns an empty array when input is undefined', () => {
      const result = ensureArray(undefined);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input is null', () => {
      const result = ensureArray(null);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input is a string', () => {
      const input = 'not an array';
      const result = ensureArray(input);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input is a number', () => {
      const input = 123;
      const result = ensureArray(input);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input is an object', () => {
      const input = { key: 'value' };
      const result = ensureArray(input);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input is a function', () => {
      const input = () => {};
      const result = ensureArray(input);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input is a boolean', () => {
      const input = true;
      const result = ensureArray(input);
      expect(result).toEqual([]);
    });

    it('returns an empty array when input is a symbol', () => {
      const input = Symbol('test');
      const result = ensureArray(input);
      expect(result).toEqual([]);
    });

    it('returns the same array when input is an empty array', () => {
      const input = [];
      const result = ensureArray(input);
      expect(result).toEqual(input);
    });
  });
});
