import { formatQuery, onlyAllowedKeys } from './utils';

describe('widget query helper functions', () => {
  describe('format query helper function', () => {
    it('returns an object with region', () => {
      const query = { 'region.in': ['18'] };
      expect(formatQuery(query)).toEqual({ ...query, region: 18 });
    });
  });

  describe('allowedKeys helper function', () => {
    it('removes disallowed keys', () => {
      const query = { badKey: 'does bad things', 'startDate.win': '2020/06/25' };
      expect(onlyAllowedKeys(query)).toEqual({ 'startDate.win': '2020/06/25' });
    });

    it('allows includeAllGoalIds for explicit dashboard selection requests', () => {
      const query = { includeAllGoalIds: 'true' };
      expect(onlyAllowedKeys(query)).toEqual(query);
    });

    it('does not allow goalIds through widget query sanitization', () => {
      const query = { goalIds: ['1', '2'], format: 'csv' };
      expect(onlyAllowedKeys(query)).toEqual({ format: 'csv' });
    });

    it('preserves goal-specific filter keys so cache keys include goal dashboard filters', () => {
      const query = {
        'status.nin': ['Closed'],
        'standard.in': ['FEI'],
        badKey: 'dropped',
      };
      const result = onlyAllowedKeys(query);
      expect(result['status.nin']).toEqual(['Closed']);
      expect(result['standard.in']).toEqual(['FEI']);
      expect(result.badKey).toBeUndefined();
    });

    it('preserves stateCode operators from goals and grants scopes', () => {
      const query = {
        'stateCode.in': ['CA'],
        'stateCode.nin': ['TX'],
        'stateCode.ctn': ['A'],
        badKey: 'dropped',
      };
      const result = onlyAllowedKeys(query);

      expect(result['stateCode.in']).toEqual(['CA']);
      expect(result['stateCode.nin']).toEqual(['TX']);
      expect(result['stateCode.ctn']).toEqual(['A']);
      expect(result.badKey).toBeUndefined();
    });
  });
});
