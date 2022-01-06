import db, { Grant } from '../models';
import { cdiGrants, grantById, assignCDIGrant } from './grant';

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
];

describe('Grant DB service', () => {
  beforeAll(async () => {
    await Promise.all(grants.map((g) => Grant.create(g)));
  });

  afterAll(async () => {
    await Grant.destroy({ where: { id: grants.map((g) => g.id) } });
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
});
