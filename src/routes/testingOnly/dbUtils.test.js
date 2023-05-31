import { QueryTypes } from 'sequelize';
import { reseed, query } from '../../../tests/utils/dbUtils';
import { reseedDB, queryDB } from './handlers';

describe('dbUtils', () => {
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
  });
  it('test reseed via handler api', async () => {
    const res = {};
    res.status = (code) => {
      expect(code).toBe(200);
      return res;
    };
    res.json = (x) => {
      const { command } = x[1];
      expect(command).toBe('ALTER');
      return res;
    };
    await queryDB(
      {
        params: {
          command: `
            ALTER SEQUENCE "Goals_id_seq"
            RESTART WITH 65535;
          `,
        },
      },
      res,
    );

    res.json = (x) => {
      expect(x).toBe(true);
      return res;
    };
    await reseedDB(
      null,
      res,
    );

    res.json = (x) => {
      const { lastValue } = x[0][0];
      expect(lastValue).not.toBe(65535);
      return res;
    };
    await queryDB(
      {
        params: {
          command: `
            SELECT last_value AS "lastValue"
            FROM "Goals_id_seq";
          `,
        },
        options: { type: QueryTypes.SELECT },
      },
      res,
    );
  });
});
