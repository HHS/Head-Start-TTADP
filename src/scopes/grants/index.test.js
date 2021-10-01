import { Op } from 'sequelize';
import filtersToScopes from '../index';
import db, { Grantee, Grant } from '../../models';

const grantees = [
  {
    id: 13259,
    name: 'grantee 13259',
  },
  {
    id: 13269,
    name: 'grantee 13269',
  },
  {
    id: 13279,
    name: 'grantee 13279',
  },
];

const possibleIds = grantees.map((grantee) => grantee.id);

describe('granteeFiltersToScopes', () => {
  beforeAll(async () => {
    await Promise.all([
      ...grantees.map((g) => Grantee.create(g)),
      await Grant.create({
        id: grantees[0].id,
        number: '1195543',
        regionId: 1,
        granteeId: grantees[0].id,
        status: 'Active',
        startDate: new Date('07/01/1997'),
        endDate: new Date('07/01/1997'),
      }),
      await Grant.create({
        id: grantees[1].id,
        number: '1195341',
        regionId: 1,
        granteeId: grantees[1].id,
        status: 'Active',
        startDate: new Date('08/01/1997'),
        endDate: new Date('08/01/1997'),
      }),
      await Grant.create({
        id: grantees[2].id,
        number: '1195343',
        regionId: 3,
        granteeId: grantees[2].id,
        status: 'Active',
        startDate: new Date('08/01/1997'),
        endDate: new Date('08/01/1997'),
      }),
    ]);
  });

  afterAll(async () => {
    await Grant.destroy({
      where: {
        ids: possibleIds,
      },
    });

    await Grantee.destroy({
      where: {
        ids: possibleIds,
      },
    });

    db.sequelize.close();
  });

  describe('startDate', () => {
    it('before', async () => {
      const filters = { 'startDate.bef': '07/31/1997' };
      const scope = filtersToScopes(filters, 'grant');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([grantees[0].id]));
    });

    it('after', async () => {
      const filters = { 'startDate.aft': '07/31/1997' };
      const scope = filtersToScopes(filters, 'grant');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([grantees[1].id, grantees[2].id]));
    });

    it('within', async () => {
      const filters = { 'startDate.win': '07/31/1997-08/02/1997' };
      const scope = filtersToScopes(filters, 'grant');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([grantees[1].id, grantees[2].id]));
    });
  });

  describe('region', () => {
    it('filters by region', async () => {
      const filters = { 'region.in': [3] };
      const scope = filtersToScopes(filters, 'grant');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([grantees[2].id]));
    });
  });
});
