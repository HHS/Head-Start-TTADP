import { Op } from 'sequelize';
import filtersToScopes from '../index';
import {
  Recipient, Grant, Program, sequelize,
} from '../../models';

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

describe('grant filtersToScopes', () => {
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
        programSpecialistName: 'No',
        stateCode: 'AZ',
      }),
      Grant.create({
        id: recipients[1].id,
        number: '1195341',
        regionId: 1,
        recipientId: recipients[1].id,
        status: 'Active',
        startDate: new Date('08/01/1997'),
        endDate: new Date('08/01/2002'),
        programSpecialistName: 'Joe Bob',
        stateCode: 'AR',
      }),
      Grant.create({
        id: recipients[2].id,
        number: '1195343',
        regionId: 3,
        recipientId: recipients[2].id,
        status: 'Active',
        startDate: new Date('08/01/1997'),
        endDate: new Date('08/01/2002'),
        programSpecialistName: 'Darcy',
        stateCode: 'AK',
      }),
    ]);

    await Program.bulkCreate([
      {
        id: recipients[0].id,
        grantId: recipients[0].id,
        startYear: 'no',
        startDate: 'no',
        endDate: 'no',
        status: 'Active',
        programType: 'EHS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: recipients[1].id,
        grantId: recipients[1].id,
        startYear: 'no',
        startDate: 'no',
        endDate: 'no',
        status: 'Active',
        programType: 'HS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      {
        id: recipients[2].id,
        grantId: recipients[2].id,
        startYear: 'no',
        startDate: 'no',
        endDate: 'no',
        status: 'Active',
        programType: 'HS',
        name: 'no',
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    ]);
  });

  afterAll(async () => {
    await Program.destroy({
      where: {
        id: possibleIds,
      },
    });

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
      const filters = { 'startDate.bef': '1997/07/31' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[0].id]));
    });

    it('after', async () => {
      const filters = { 'startDate.aft': '1997/07/31' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[1].id, recipients[2].id]));
    });

    it('within', async () => {
      const filters = { 'startDate.win': '1997/07/31-1997/08/02' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: {
          [Op.and]: [scope.grant, { id: possibleIds }],
        },
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
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id))
        .toEqual(expect.arrayContaining([recipients[2].id]));
    });
  });
  describe('recipientName', () => {
    it('filters by', async () => {
      const filters = { 'recipient.ctn': '13269' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[1].id);
    });
    it('filters out', async () => {
      const filters = { 'recipient.nctn': '13269' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.map((f) => f.id)).toStrictEqual([13259, 13279]);
    });
  });

  describe('programSpecialist', () => {
    it('filters by', async () => {
      const filters = { 'programSpecialist.ctn': 'Darcy' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[2].id);
    });
    it('filters out', async () => {
      const filters = { 'programSpecialist.nctn': 'Darcy' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id)).toStrictEqual([13259, 13269]);
    });
  });
  describe('programType', () => {
    it('filters by', async () => {
      const filters = { 'programType.in': ['EHS'] };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[0].id);
    });
    it('filters out', async () => {
      const filters = { 'programType.nin': ['EHS'] };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id)).toContain(recipients[2].id);
      expect(found.map((f) => f.id)).toContain(recipients[1].id);
    });
  });
  describe('grantNumber', () => {
    it('filters by', async () => {
      const filters = { 'grantNumber.ctn': '1195543' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[0].id);
    });
    it('filters out', async () => {
      const filters = { 'grantNumber.nctn': '1195543' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(2);
      expect(found.map((f) => f.id)).toContain(recipients[1].id);
      expect(found.map((f) => f.id)).toContain(recipients[2].id);
    });
  });
  describe('stateCode', () => {
    it('filters by', async () => {
      const filters = { 'stateCode.ctn': 'AZ' };
      const scope = filtersToScopes(filters);
      const found = await Grant.findAll({
        attributes: ['id', 'stateCode'],
        where: { [Op.and]: [scope.grant, { id: possibleIds }] },
      });
      expect(found.length).toBe(1);
      expect(found.map((f) => f.id)).toContain(recipients[0].id);
    });
  });
});
