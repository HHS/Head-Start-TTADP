import { QueryTypes } from 'sequelize';
import request from 'supertest';
import { reseed } from '../../../tests/utils/dbUtils';
import SCOPES from '../../middleware/scopeConstants';
import db, {
  User,
  Permission,
} from '../../models';
import app from '../../app';

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

describe('dbUtils', () => {
  let preBypass;
  let preuserId;
  beforeAll(() => {
    preBypass = process.env.BYPASS_AUTH;
    preuserId = process.env.CURRENT_USER_ID;
  });
  beforeEach(async () => {
    if (!await User.findOne({ where: { id: mockUser.id } })) {
      await User.create(mockUser, { include: [{ model: Permission, as: 'permissions' }] });
    }
    process.env.BYPASS_AUTH = 'true';
    process.env.CURRENT_USER_ID = 110110;
  });
  afterAll(async () => {
    process.env.BYPASS_AUTH = preBypass;
    process.env.CURRENT_USER_ID = preuserId;
    await User.destroy({ where: { id: mockUser.id } });
    await db.sequelize.close();
  });
  it('test reseed via function api', async () => {
    await db.sequelize.query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH 65535;
    `);

    const wasReseeded = await reseed();

    expect(wasReseeded).toBe(true);

    const [{ lastValue }] = await db.sequelize.query(`
      select last_value as "lastValue" from "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    expect(lastValue).not.toBe(65535);
  });
  it('test reseed via route api', async () => {
    await db.sequelize.query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH 65535;
    `);

    await request(app).get('/api/testing/reseed').expect(200);

    const [{ lastValue }] = await db.sequelize.query(`
      select last_value as "lastValue" from "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    expect(lastValue).not.toBe(65535);
  });
  it('test reseed via route - fail - only for', async () => {
    const [{ lastValueToRestore }] = await db.sequelize.query(`
      select last_value as "lastValueToRestore" from "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    await db.sequelize.query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH 65535;
    `);

    const currentEnvNode = process.env.NODE_ENV;
    let currentEnvCI;
    if (process.env.CI) {
      currentEnvCI = process.env.CI;
      delete process.env.CI;
    }
    process.env.NODE_ENV = 'X';
    await request(app).get('/api/testing/reseed').expect(403);
    process.env.NODE_ENV = currentEnvNode;
    if (currentEnvCI) {
      process.env.CI = currentEnvCI;
    }

    const [{ lastValue }] = await db.sequelize.query(`
      select last_value as "lastValue" from "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    expect(lastValue).toBe('65535');

    await db.sequelize.query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH ${lastValueToRestore};
    `);
  });
  it('test reseed via route - fail - auth bypass not valid', async () => {
    const [{ lastValueToRestore }] = await db.sequelize.query(`
      select last_value as "lastValueToRestore" from "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    await db.sequelize.query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH 65535;
    `);

    const currentEnvNode = process.env.NODE_ENV;
    let currentEnvCI;
    if (process.env.CI) {
      currentEnvCI = process.env.CI;
      delete process.env.CI;
    }
    process.env.NODE_ENV = 'production';
    await request(app).get('/api/testing/reseed').expect(401);
    process.env.NODE_ENV = currentEnvNode;
    if (currentEnvCI) {
      process.env.CI = currentEnvCI;
    }

    const [{ lastValue }] = await db.sequelize.query(`
      select last_value as "lastValue" from "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    expect(lastValue).toBe('65535');

    await db.sequelize.query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH ${lastValueToRestore};
    `);
  });
});
