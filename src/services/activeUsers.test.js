import db, {
  User, sequelize,
} from '../models';

import activeUsers from './activeUsers';


describe('Active users DB service', () => {
  afterAll(async () => {
    const conn = await sequelize.connectionManager.getConnection();
    await sequelize.connectionManager.releaseConnection(conn);
    await db.sequelize.close();
  });

  describe('activeUsers', () => {
    beforeEach(async () => {
      await User.create({
        id: 54,
        name: 'user 54',
        hsesUsername: 'user.54',
        hsesUserId: '54',
      });
      await User.create({
        id: 55,
        name: 'user 55',
        hsesUsername: 'user.55',
        hsesUserId: '55',
      });
    });

    afterEach(async () => {
      await User.destroy({ where: { id: [54, 55] } });
    });

    it('returns a readable stream', async () => {
      const usersStream = await activeUsers();
      expect(usersStream).toBeDefined();
      expect(usersStream._readableState.defaultEncoding).toBe('utf8');
    });
  });
});
