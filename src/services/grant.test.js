import db, { Grant, Region, Recipient } from '../models';
import {
  cdiGrants, grantById, assignCDIGrant, statesByGrantRegion,
} from './grant';

const grants = [
  {
    id: 90,
    recipientId: 1,
    number: 'zz123',
    cdi: true,
    regionId: 13,
  },
  {
    id: 91,
    recipientId: 1,
    number: 'zz456',
    cdi: true,
    regionId: 13,
  },
  {
    id: 92,
    recipientId: 1,
    number: 'zz789',
    cdi: false,
    regionId: 13,
  },
  {
    id: 278,
    recipientId: 129129,
    number: 'grant278',
    cdi: false,
    regionId: 129129,
    stateCode: null,
  },
  {
    id: 279,
    recipientId: 129129,
    number: 'grant279',
    cdi: false,
    regionId: 129129,
    stateCode: 'FM',
  },
  {
    id: 280,
    recipientId: 129129,
    number: 'grant280',
    cdi: false,
    regionId: 129129,
    stateCode: 'GA',
  },
  {
    id: 281,
    recipientId: 129129,
    number: 'grant281',
    cdi: false,
    regionId: 129130,
    stateCode: 'RI',
  },
];

describe('Grant DB service', () => {
  beforeAll(async () => {
    await Recipient.create({ name: 'recipient', id: 129129 });
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
    await Grant.destroy({ where: { id: grants.map((g) => g.id) } });
    await Region.destroy({
      where: {
        id: [129129, 129130],
      },
    });
    await Recipient.destroy({ where: { id: 129130 } });
    await db.sequelize.close();
  });

  describe('grantById', () => {
    it('returns the grant', async () => {
      const grant = await grantById(90);
      expect(grant.number).toEqual('zz123');
    });
  });

  describe('assignCDIGrant', () => {
    it('assigns recipient and regionId', async () => {
      const grant = await Grant.findOne({ where: { id: 92 } });
      const newGrant = await assignCDIGrant(grant, 5, 1);
      expect(newGrant.regionId).toEqual(5);
      expect(newGrant.recipientId).toEqual(1);
    });
  });

  describe('cdiGrants', () => {
    it('returns all CDI grants', async () => {
      const foundRecipients = await cdiGrants();
      const foundIds = foundRecipients.map((g) => g.id);
      expect(foundIds).toContain(90);
      expect(foundIds).toContain(91);
      expect(foundIds).not.toContain(92);
    });

    it('can return unassigned grants', async () => {
      const foundRecipients = await cdiGrants('true');
      const foundIds = foundRecipients.map((g) => g.id);
      expect(foundIds.length).toBe(5);
    });
  });

  describe('statesByGrantRegion', () => {
    it('returns the correct state codes given a region', async () => {
      const codes = await statesByGrantRegion([129129]);
      expect(codes).toStrictEqual(['FM', 'GA']);
    });
  });
});
