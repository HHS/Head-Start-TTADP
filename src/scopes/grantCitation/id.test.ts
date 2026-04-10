import { Op } from 'sequelize';
import { withId } from './id';

describe('grantCitation/id', () => {
  describe('withId', () => {
    it('converts valid numeric strings to numbers in an Op.in clause', () => {
      expect(withId(['1', '2', '3'])).toEqual({ id: { [Op.in]: [1, 2, 3] } });
    });

    it('strips non-numeric strings from the clause', () => {
      expect(withId(['1', 'not-a-number', '3'])).toEqual({ id: { [Op.in]: [1, 3] } });
    });

    it('converts empty string to 0 (Number("") === 0, passes NaN guard)', () => {
      expect(withId(['2', ''])).toEqual({ id: { [Op.in]: [2, 0] } });
    });

    it('returns an empty Op.in clause when all IDs are non-numeric', () => {
      expect(withId(['abc', 'xyz'])).toEqual({ id: { [Op.in]: [] } });
    });

    it('returns an empty Op.in clause for an empty array', () => {
      expect(withId([])).toEqual({ id: { [Op.in]: [] } });
    });

    it('only integers pass our brutal gauntlet', () => {
      expect(withId(['1.5', '2'])).toEqual({ id: { [Op.in]: [2] } });
    });
  });
});
