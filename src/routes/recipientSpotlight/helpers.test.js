import { extractFilterArray } from './helpers';

describe('recipientSpotlight helpers', () => {
  describe('extractFilterArray', () => {
    it('returns empty array when neither bracket nor non-bracket key exists', () => {
      const query = {};
      expect(extractFilterArray(query, 'priorityIndicator', 'in')).toEqual([]);
    });

    it('returns array from a single string value (non-bracket key)', () => {
      const query = { 'priorityIndicator.in': 'New staff' };
      expect(extractFilterArray(query, 'priorityIndicator', 'in')).toEqual(['New staff']);
    });

    it('returns array as-is when value is already an array (non-bracket key)', () => {
      const query = { 'priorityIndicator.in': ['New staff', 'Deficiency'] };
      expect(extractFilterArray(query, 'priorityIndicator', 'in')).toEqual(['New staff', 'Deficiency']);
    });

    it('returns array from a single string value (bracket key)', () => {
      const query = { 'priorityIndicator.in[]': 'No TTA' };
      expect(extractFilterArray(query, 'priorityIndicator', 'in')).toEqual(['No TTA']);
    });

    it('returns array as-is when value is already an array (bracket key)', () => {
      const query = { 'priorityIndicator.in[]': ['No TTA', 'Deficiency'] };
      expect(extractFilterArray(query, 'priorityIndicator', 'in')).toEqual(['No TTA', 'Deficiency']);
    });

    it('prefers bracket key over non-bracket key when both exist', () => {
      const query = {
        'priorityIndicator.in[]': 'bracket-value',
        'priorityIndicator.in': 'non-bracket-value',
      };
      expect(extractFilterArray(query, 'priorityIndicator', 'in')).toEqual(['bracket-value']);
    });

    it('works with nin operator', () => {
      const query = { 'priorityIndicator.nin': 'No TTA' };
      expect(extractFilterArray(query, 'priorityIndicator', 'nin')).toEqual(['No TTA']);
    });

    it('works with region base name', () => {
      const query = { 'region.in': ['1', '2'] };
      expect(extractFilterArray(query, 'region', 'in')).toEqual(['1', '2']);
    });
  });
});
