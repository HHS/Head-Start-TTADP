import { Op } from 'sequelize';
import { grantCitationFiltersToScopes, topicToQuery } from './index';

describe('grantCitation/index', () => {
  describe('topicToQuery', () => {
    it('routes id.in to the withId scope function', () => {
      const result = topicToQuery.id.in(['10', '20', '30']);
      expect(result).toEqual({ id: { [Op.in]: [10, 20, 30] } });
    });

    it('routes citationRecipient.in to the withCitationRecipient scope function', () => {
      const result = topicToQuery.citationRecipient.in(['1:2', '3:4']);
      expect(result).toEqual([
        { citationId: 1, recipient_id: 2 },
        { citationId: 3, recipient_id: 4 },
      ]);
    });
  });

  describe('grantCitationFiltersToScopes', () => {
    it('returns a scope array with Op.in clause for valid id.in filter', () => {
      const scopes = grantCitationFiltersToScopes({ 'id.in': ['5', '6'] }, {}, null, null);
      expect(scopes).toEqual([{ id: { [Op.in]: [5, 6] } }]);
    });

    it('ignores unrecognized filter keys', () => {
      const scopes = grantCitationFiltersToScopes({ 'name.in': ['foo'] }, {}, null, null);
      expect(scopes).toEqual([]);
    });

    it('ignores unknown conditions on recognized topics', () => {
      const scopes = grantCitationFiltersToScopes({ 'id.nin': ['1'] }, {}, null, null);
      expect(scopes).toEqual([]);
    });

    it('returns an empty array for empty filters', () => {
      const scopes = grantCitationFiltersToScopes({}, {}, null, null);
      expect(scopes).toEqual([]);
    });

    it('returns an empty array for null/undefined filters', () => {
      expect(grantCitationFiltersToScopes(null, {}, null, null)).toEqual([]);
      expect(grantCitationFiltersToScopes(undefined, {}, null, null)).toEqual([]);
    });

    it('filters out non-numeric IDs from the id.in scope', () => {
      const scopes = grantCitationFiltersToScopes({ 'id.in': ['7', 'bad', '9'] }, {}, null, null);
      expect(scopes).toEqual([{ id: { [Op.in]: [7, 9] } }]);
    });
  });
});
