import { QueryTypes } from 'sequelize';
import { reseed } from './dbUtils';
import db from '../../src/models';

describe('dbUtils', () => {
  it('test reseed', async () => {
    await db.sequelize.query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH 65535;
    `);

    const wasReseeded = await reseed();

    expect(wasReseeded).toBe(true);

    const [{last_value}] = await db.sequelize.query(`
      select last_value from "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    expect(last_value).not.toBe(65535);
  });
});
