const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      /*
      Dropping old referances:
          ZALNoTruncateFActivityReportObjectiveRoles
          ZALNoTruncateFGrantGoals
          ZALNoTruncateFObjectiveRoles
          ZALNoTruncateFTopicGoals
          ZALNoDeleteFActivityReportObjectiveRoles
          ZALNoDeleteFGrantGoals
          ZALNoDeleteFObjectiveRoles
          ZALNoDeleteFTopicGoals
          ZALNoUpdateFActivityReportObjectiveRoles
          ZALNoUpdateFGrantGoals
          ZALNoUpdateFObjectiveRoles
          ZALNoUpdateFTopicGoals
      */
      return queryInterface.sequelize.query(`
        DO
        $$
        DECLARE
            drop_stmt text;
        BEGIN
            FOR drop_stmt IN
                WITH all_tables AS (
                    SELECT table_name
                    FROM information_schema.tables
                    WHERE table_type = 'BASE TABLE' AND table_schema NOT IN ('information_schema', 'pg_catalog')
                ),
                all_functions AS (
                    SELECT routine_name
                    FROM information_schema.routines
                    WHERE routine_type = 'FUNCTION' AND specific_schema NOT IN ('information_schema', 'pg_catalog')
                )
                SELECT 'DROP FUNCTION "' || f.routine_name || '"();' AS drop_statement
                FROM all_functions f
                LEFT JOIN all_tables t
                ON f.routine_name LIKE 'ZALNoTruncateF' || t.table_name
                OR f.routine_name LIKE 'ZALNoDeleteF' || t.table_name
                OR f.routine_name LIKE 'ZALNoUpdateF' || t.table_name
                WHERE t.table_name IS NULL
                AND (f.routine_name LIKE 'ZALNoTruncateF%'
                    OR f.routine_name LIKE 'ZALNoDeleteF%'
                    OR f.routine_name LIKE 'ZALNoUpdateF%')
                AND f.routine_name NOT LIKE '%DDL'
            LOOP
                EXECUTE drop_stmt;
            END LOOP;
        END
        $$;
      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
