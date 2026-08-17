import { safeParseInt } from './safeParse';

describe('safeParse', () => {
  describe('safeParseInt', () => {
    it('should parse a valid integer string', () => {
      expect(safeParseInt('42')).toBe(42);
    });

    it('should return null for an invalid integer string', () => {
      expect(safeParseInt('abc')).toBeNull();
    });

    it('should return null for an empty string', () => {
      expect(safeParseInt('')).toBeNull();
    });

    it('should return a valid number as-is', () => {
      expect(safeParseInt(42)).toBe(42);
    });

    it('should return null for a non-string input', () => {
      expect(safeParseInt(null)).toBeNull();
      expect(safeParseInt(undefined)).toBeNull();
      expect(safeParseInt({})).toBeNull();
      expect(safeParseInt([])).toBeNull();
    });
  });
});
