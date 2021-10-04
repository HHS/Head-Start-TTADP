import app from '../app';
import SCOPES from '../middleware/scopeConstants';
import db, {
  User,
  Permission,
} from '../models';

const request = require('supertest');

const mockUser = {
  id: 110110,
  hsesUserId: '110110',
  hsesUsername: 'user110110',
  homeRegionId: 1,
  permissions: [
    {
      userId: 110110,
      regionId: 5,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
    {
      userId: 110110,
      regionId: 6,
      scopeId: SCOPES.READ_WRITE_REPORTS,
    },
    {
      userId: 110110,
      regionId: 14,
      scopeId: SCOPES.SITE_ACCESS,
    },
  ],
};

describe('apiDirectory tests', () => {
  beforeAll(async () => {
    await User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] });
    process.env.NODE_ENV = 'test';
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = 110110;
  });
  afterAll(async () => {
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });

  it('tests an unknown route', async () => {
    await request(app)
      .get('/api/unknown')
      .then((res) => {
        expect(res.statusCode).toBe(404);
      });
  });
  it('tests the logout route', async () => {
    await request(app)
      .get('/api/logout')
      .then((res) => {
        expect(res.statusCode).toBe(204);
      });
  });
});
