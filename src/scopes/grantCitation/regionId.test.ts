import { Op } from 'sequelize';
import { withoutRegion, withRegion } from './regionId';

describe('grantCitation/regionId', () => {
  describe('withRegion', () => {
    it('returns an Op.in clause for a single region', () => {
      expect(withRegion([1])).toEqual({
        where: { region_id: { [Op.in]: [1] } },
      });
    });

    it('returns an Op.in clause for multiple regions', () => {
      expect(withRegion([1, 2, 3])).toEqual({
        where: { region_id: { [Op.in]: [1, 2, 3] } },
      });
    });

    it('returns an Op.in clause with an empty array', () => {
      expect(withRegion([])).toEqual({
        where: { region_id: { [Op.in]: [] } },
      });
    });
  });

  describe('withoutRegion', () => {
    it('returns an Op.notIn clause for a single region', () => {
      expect(withoutRegion([1])).toEqual({
        where: { region_id: { [Op.notIn]: [1] } },
      });
    });

    it('returns an Op.notIn clause for multiple regions', () => {
      expect(withoutRegion([1, 2, 3])).toEqual({
        where: { region_id: { [Op.notIn]: [1, 2, 3] } },
      });
    });

    it('returns an Op.notIn clause with an empty array', () => {
      expect(withoutRegion([])).toEqual({
        where: { region_id: { [Op.notIn]: [] } },
      });
    });
  });
});
