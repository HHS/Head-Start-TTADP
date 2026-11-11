import { sequelize } from '../../models';

const FIXTURE_TABLE = `temporal_test_fixture_${Date.now()}`;

describe('auditLogTimeseries', () => {
  beforeAll(async () => {
    await sequelize.query(`
      CREATE TABLE ${FIXTURE_TABLE} (
        id SERIAL PRIMARY KEY,
        status_id INTEGER,
        correction_deadline TIMESTAMPTZ,
        deleted_at TIMESTAMPTZ
      );
    `);
  });

  afterAll(async () => {
    // Narrow per-table teardown, not removeTables()'s global audit-disable
    // bracket - see 20260909150000-create_validation_tables.js for the same
    // pattern. Detach auditing before dropping, or the database's own
    // DDL-drop event trigger errors trying to strip audit wrapping off the
    // table's primary key index.
    await sequelize.query(`
      SELECT "ZAFRemoveAuditingOnTable"('${FIXTURE_TABLE}');
      DROP TABLE IF EXISTS "ZAL${FIXTURE_TABLE}";
      DROP TABLE IF EXISTS ${FIXTURE_TABLE};
    `);
    await sequelize.close();
  });

  it('reconstructs per-column history, one band per audit event', async () => {
    // Each of these runs as its own separately-committed statement (not one
    // shared transaction) so each gets a genuinely distinct dml_timestamp,
    // same as separate real-world writes would - CURRENT_TIMESTAMP in the
    // audit trigger is pinned to transaction start, so statements sharing a
    // transaction would all get the identical raw timestamp.
    await sequelize.query(
      `INSERT INTO ${FIXTURE_TABLE} (status_id, correction_deadline, deleted_at)
       VALUES (100, '2020-01-01'::timestamptz, NULL);`
    );

    // deadline only - status_id must carry forward unchanged into this band.
    await sequelize.query(
      `UPDATE ${FIXTURE_TABLE} SET correction_deadline = '2021-01-01'::timestamptz;`
    );

    // status only - an unrelated-column event still starts a new band
    // (the per-event-not-per-value-change behavior this test is pinning down).
    await sequelize.query(`UPDATE ${FIXTURE_TABLE} SET status_id = 200;`);

    // soft-delete.
    await sequelize.query(`UPDATE ${FIXTURE_TABLE} SET deleted_at = NOW();`);

    // restore + status change in the same statement/event.
    await sequelize.query(`UPDATE ${FIXTURE_TABLE} SET deleted_at = NULL, status_id = 300;`);

    // deadline only, final live value.
    await sequelize.query(
      `UPDATE ${FIXTURE_TABLE} SET correction_deadline = '2022-06-15'::timestamptz;`
    );

    // create_timeseries_from_audit_log's output table is a plain (not
    // ON COMMIT DROP) temp table, scoped to one DB connection - the function
    // call and the SELECT reading its result must share this one
    // transaction's connection, or the SELECT could land on a different
    // pooled connection and never see it.
    const [bands] = await sequelize.transaction(async (transaction) => {
      await sequelize.query(`SELECT create_timeseries_from_audit_log('${FIXTURE_TABLE}');`, {
        transaction,
      });

      return sequelize.query(
        `SELECT data_id, timeband_start, timeband_end, status_id, correction_deadline, deleted_at
         FROM ${FIXTURE_TABLE}_timeseries
         ORDER BY timeband_start;`,
        { transaction }
      );
    });

    expect(bands).toHaveLength(6);
    const [b1, b2, b3, b4, b5, live] = bands as Array<{
      data_id: number;
      timeband_start: Date;
      timeband_end: Date | number;
      status_id: number;
      correction_deadline: Date;
      deleted_at: Date | null;
    }>;

    expect(b1.status_id).toBe(100);
    expect(b1.correction_deadline.toISOString()).toBe(new Date('2020-01-01').toISOString());
    expect(b1.deleted_at).toBeNull();

    expect(b2.status_id).toBe(100);
    expect(b2.correction_deadline.toISOString()).toBe(new Date('2021-01-01').toISOString());
    expect(b2.deleted_at).toBeNull();

    expect(b3.status_id).toBe(200);
    expect(b3.correction_deadline.toISOString()).toBe(new Date('2021-01-01').toISOString());
    expect(b3.deleted_at).toBeNull();

    expect(b4.status_id).toBe(200);
    expect(b4.correction_deadline.toISOString()).toBe(new Date('2021-01-01').toISOString());
    expect(b4.deleted_at).not.toBeNull();

    expect(b5.status_id).toBe(300);
    expect(b5.correction_deadline.toISOString()).toBe(new Date('2021-01-01').toISOString());
    expect(b5.deleted_at).toBeNull();

    expect(live.status_id).toBe(300);
    expect(live.correction_deadline.toISOString()).toBe(new Date('2022-06-15').toISOString());
    expect(live.deleted_at).toBeNull();
    expect(live.timeband_end).toBe(Infinity);

    // Bands form a continuous, strictly increasing chain.
    for (let i = 1; i < bands.length; i += 1) {
      const current = bands[i] as { timeband_start: Date };
      const previous = bands[i - 1] as { timeband_start: Date };
      expect(new Date(current.timeband_start).getTime()).toBeGreaterThan(
        new Date(previous.timeband_start).getTime()
      );
    }
  });
});
