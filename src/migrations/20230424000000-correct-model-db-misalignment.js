module.exports = {
  up: async (queryInterface, Sequelize) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      // Updating the audit log function to use timestamp with time zone.
      await queryInterface.sequelize.query(
        `CREATE OR REPLACE FUNCTION "ZAFCreateALTable"(t_name varchar(63))
            RETURNS VOID
            LANGUAGE plpgsql AS
          $func$
          BEGIN
            RAISE NOTICE 'Create Audit Log Table: %','ZAL' || t_name;
            EXECUTE format($sql$
                CREATE TABLE IF NOT EXISTS %I (
                  id BIGSERIAL,
                  data_id bigint NOT NULL,
                  dml_type dml_type NOT NULL,
                  old_row_data jsonb,
                  new_row_data jsonb,
                  dml_timestamp timestamp with time zone NOT NULL,
                  dml_by bigint NOT NULL,
                  dml_as bigint NOT NULL,
                  dml_txid uuid NOT NULL,
                  session_sig TEXT NULL,
                  descriptor_id INT,
                  PRIMARY KEY (id)
                  );$sql$,
                  'ZAL' || t_name);
          END
          $func$;`,
        { transaction }
      )

      // Remove the current audit system from all tables
      await queryInterface.sequelize.query(
        `DO $$
        DECLARE
          obj record;
        BEGIN
          PERFORM "ZAFSetTriggerState"(null, null, null, 'DISABLE');

          FOR obj IN
            SELECT table_name as "tableName"
            FROM information_schema.tables
            WHERE table_schema='public'
              AND table_type='BASE TABLE'
              AND table_name != 'SequelizeMeta'
              AND table_name != 'RequestErrors'
              AND table_name LIKE 'ZAL%'
              AND table_name NOT LIKE 'ZALDDL'
          LOOP
            RAISE INFO 'Audit Tables: Update audit table on "%"', obj."tableName";

            -- Fix type of dml_by - was int, should be bigint
            EXECUTE format($sql$
              ALTER TABLE %I
              ALTER COLUMN "dml_timestamp" TYPE timestamp with time zone $sql$,
              obj."tableName"::text);

          END LOOP;

          PERFORM "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        END$$;`,
        { transaction }
      )

      await queryInterface.changeColumn(
        'ActivityReportGoals',
        'endDate',
        { type: Sequelize.DATEONLY, allowNull: true, defaultValue: null },
        { transaction }
      )

      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction }
      )
      // clean up orphan tables
      await Promise.all(
        ['ObjectiveTemplateRoles', 'DisconnectedGoals'].map(async (table) => {
          await queryInterface.sequelize.query(` SELECT "ZAFRemoveAuditingOnTable"('${table}');`, {
            raw: true,
            transaction,
          })
          // Drop old audit log table
          await queryInterface.dropTable(`ZAL${table}`, { transaction })
          await queryInterface.dropTable(table, { transaction })
        })
      )

      // clean up orphan audit tables
      await Promise.all(
        ['ZALTopicGoals', 'ZALGrantGoals'].map(async (table) => {
          await queryInterface.dropTable(`${table}`, { transaction })
        })
      )
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction }
      )
    }),
  down: async () => {},
}
