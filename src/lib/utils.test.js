import { ensureArray, formatDate, parseStoredDate, uniqueStrings } from './utils';

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
  describe('parseStoredDate', () => {
    it('parses MM/DD/YYYY dates', () => {
      expect(parseStoredDate('08/11/2026').format('YYYY-MM-DD')).toBe('2026-08-11');
    });

    it('parses ISO dates', () => {
      expect(parseStoredDate('2026-08-11T00:00:00.000Z').isValid()).toBe(true);
      expect(parseStoredDate('2026-08-11').format('YYYY-MM-DD')).toBe('2026-08-11');
    });

    it('parses Date objects', () => {
      expect(parseStoredDate(new Date(2026, 7, 11)).format('YYYY-MM-DD')).toBe('2026-08-11');
    });

    it('returns an invalid moment for empty or unparseable values', () => {
      expect(parseStoredDate('').isValid()).toBe(false);
      expect(parseStoredDate(null).isValid()).toBe(false);
      expect(parseStoredDate(undefined).isValid()).toBe(false);
      expect(parseStoredDate('not a date').isValid()).toBe(false);
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
