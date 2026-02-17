import { QueryTypes } from 'sequelize';
import db from '../../models';
import { reseed, query } from '../../../tests/utils/dbUtils';

describe('dbUtils', () => {
  afterAll(() => db.sequelize.close());
  it('test reseed via function api', async () => {
    await query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH 65535;
    `, null);

    const wasReseeded = await reseed();

    expect(wasReseeded).toBe(true);

    const [{ lastValue }] = await query(`
    SELECT last_value AS "lastValue"
    FROM "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    expect(lastValue).not.toBe(65535);
  }, 180000);
});
