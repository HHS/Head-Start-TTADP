import db, { Grantee } from '../models';
import { allGrantees } from './grantee';

describe('Grantee DB service', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  afterAll(async () => {
    await db.sequelize.close();
  });

  describe('allGrantees', () => {
    const grantees = [
      {
        id: 60,
        name: 'grantee 1',
      },
      {
        id: 61,
        name: 'grantee 2',
      },
      {
        id: 62,
        name: 'grantee 3',
      },
    ];

    beforeEach(async () => {
      await Promise.all(grantees.map((g) => Grantee.create(g)));
    });

    afterEach(async () => {
      await Grantee.destroy({ where: { id: grantees.map((g) => g.id) } });
    });

    it('returns all grantees', async () => {
      const foundGrantees = await allGrantees();
      const foundIds = foundGrantees.map((g) => g.id);
      expect(foundIds).toContain(60);
      expect(foundIds).toContain(61);
      expect(foundIds).toContain(62);
    });
  });
});
