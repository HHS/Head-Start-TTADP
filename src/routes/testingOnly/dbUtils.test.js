import { QueryTypes } from 'sequelize';
import { reseed, query } from '../../../tests/utils/dbUtils';

describe('dbUtils', () => {
  it('test reseed via function api', async () => {
    await query(`
      ALTER SEQUENCE "Goals_id_seq"
      RESTART WITH 65535;
    `);

    const wasReseeded = await reseed();

    expect(wasReseeded).toBe(true);

    const [{ lastValue }] = await query(`
    SELECT last_value AS "lastValue"
    FROM "Goals_id_seq";
    `, { type: QueryTypes.SELECT });

    expect(lastValue).not.toBe(65535);
  });
});
