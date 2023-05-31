import { QueryTypes } from 'sequelize';
import { reseed, query } from '../../../tests/utils/dbUtils';
import { reseedDB, queryDB } from './handlers';

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
  it('test reseed via handler api', async () => {
    await queryDB(
      {
        params: {
          command: `
            ALTER SEQUENCE "Goals_id_seq"
            RESTART WITH 65535;
          `,
        },
      },
    );

    const wasReseeded = await reseedDB(null, null);

    expect(wasReseeded).toBe(true);

    const [{ lastValue }] = await queryDB(
      {
        params: {
          command: `
            SELECT last_value AS "lastValue"
            FROM "Goals_id_seq";
          `,
        },
        options: { type: QueryTypes.SELECT },
      },
    );

    expect(lastValue).not.toBe(65535);
  });
});
