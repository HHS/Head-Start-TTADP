import { Op } from 'sequelize';
import filtersToScopes from '../index';
import { Recipient, Grant, sequelize } from '../../models';

const recipients = [
  {
    id: 13259,
    name: 'recipient 13259',
  },
  {
    id: 13269,
    name: 'recipient 13269',
  },
  {
    id: 13279,
    name: 'recipient 13279',
  },
];

const possibleIds = recipients.map((recipient) => recipient.id);

describe('recipientFiltersToScopes', () => {
  beforeAll(async () => {
    await Promise.all(recipients.map((g) => Recipient.create(g)));
    await Promise.all([
      Grant.create({
        id: recipients[0].id,
        number: '1195543',
        regionId: 1,
        recipientId: recipients[0].id,
        status: 'Active',
        startDate: new Date('07/01/1997'),
        endDate: new Date('07/01/1997'),
      }),
      Grant.create({
        id: recipients[1].id,
        number: '1195341',
        regionId: 1,
        recipientId: recipients[1].id,
        status: 'Active',
        startDate: new Date('08/01/1997'),
        endDate: new Date('08/01/1997'),
      }),
      Grant.create({
        id: recipients[2].id,
        number: '1195343',
        regionId: 3,
        recipientId: recipients[2].id,
        status: 'Active',
        startDate: new Date('08/01/1997'),
        endDate: new Date('08/01/1997'),
      }),
    ]);
  });

  afterAll(async () => {
    await Grant.destroy({
      where: {
        id: possibleIds,
      },
    });

    await Recipient.destroy({
      where: {
        id: possibleIds,
      },
    });

    await sequelize.close();
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
        .toEqual(expect.arrayContaining([recipients[0].id]));
    });

    it('after', async () => {
      const filters = { 'startDate.aft': '07/31/1997' };
      const scope = filtersToScopes(filters, 'grant');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id]));
    });

    it('within', async () => {
      const filters = { 'startDate.win': '07/31/1997-08/02/1997' };
      const scope = filtersToScopes(filters, 'grant');
      const found = await Grant.findAll({
        where: { [Op.and]: [scope, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id]));
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
        .toEqual(expect.arrayContaining([recipients[2].id]));
    });
  });
});
