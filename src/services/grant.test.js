import db, { Grant, Region, Recipient } from '../models';
import {
  grantById, statesByGrantRegion,
} from './grant';

const grants = [
  {
    id: 90,
    recipientId: 1,
    number: 'zz123',
    cdi: true,
    regionId: 13,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 91,
    recipientId: 1,
    number: 'zz456',
    cdi: true,
    regionId: 13,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 92,
    recipientId: 1,
    number: 'zz789',
    cdi: false,
    regionId: 13,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 278,
    recipientId: 129129,
    number: 'grant278',
    cdi: false,
    regionId: 129129,
    stateCode: null,
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 279,
    recipientId: 129129,
    number: 'grant279',
    cdi: false,
    regionId: 129129,
    stateCode: 'FM',
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 280,
    recipientId: 129129,
    number: 'grant280',
    cdi: false,
    regionId: 129129,
    stateCode: 'GA',
    startDate: new Date(),
    endDate: new Date(),
  },
  {
    id: 281,
    recipientId: 129129,
    number: 'grant281',
    cdi: false,
    regionId: 129130,
    stateCode: 'RI',
    startDate: new Date(),
    endDate: new Date(),
  },
];

describe('Grant DB service', () => {
  beforeAll(async () => {
    await Recipient.create({ name: 'recipient', id: 129129, uei: 'NNA5N2KHMGN2' });
    await Region.create(
      {
        id: 129129,
        name: 'office 14',
      },
    );
    await Region.create(
      {
        id: 129130,
        name: 'office 15',
      },
    );
    await Promise.all(grants.map((g) => Grant.create(g)));
  });

  afterAll(async () => {
    await Grant.unscoped().destroy({
      where: { id: grants.map((g) => g.id) },
      individualHooks: true,
    });
    await Region.destroy({
      where: {
        id: [129129, 129130],
      },
    });
    await Recipient.unscoped().destroy({ where: { id: 129129 } });
    await db.sequelize.close();
  });

  describe('grantById', () => {
    it('returns the grant', async () => {
      const grant = await grantById(90);
      expect(grant.number).toEqual('zz123');
    });
  });

  describe('statesByGrantRegion', () => {
    it('returns the correct state codes given a region', async () => {
      const codes = await statesByGrantRegion([129129]);
      expect(codes).toStrictEqual(['FM', 'GA']);
    });
  });
});
