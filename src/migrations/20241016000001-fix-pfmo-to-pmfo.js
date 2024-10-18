const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      return queryInterface.sequelize.query(`
        -- There are still two places the PMFO national center name was erroneously
        -- recorded as PFMO:
        -- - EventReportPilotNationalCenterUsers.nationalCenterName
        -- - SessionReportPilots.data->objectiveTrainers

        DROP TABLE IF EXISTS corrected_erpncu;
        CREATE TEMP TABLE corrected_erpncu
        AS
        WITH updater AS (
        UPDATE "EventReportPilotNationalCenterUsers"
        SET "nationalCenterName" = 'PMFO'
        WHERE "nationalCenterName" = 'PFMO'
        RETURNING id
        )
        SELECT * FROM UPDATER
        ;

        DROP TABLE IF EXISTS corrected_srp;
        CREATE TEMP TABLE corrected_srp
        AS
        WITH updater AS (
        UPDATE "SessionReportPilots"
        SET data = regexp_replace(data::text,'PFMO','PMFO')::jsonb
        RETURNING id
        )
        SELECT * FROM UPDATER
        ;

        DROP TABLE IF EXISTS corrected_erp;
        CREATE TEMP TABLE corrected_erp
        AS
        WITH updater AS (
        UPDATE "EventReportPilots"
        SET data = regexp_replace(data::text,'PFMO','PMFO')::jsonb
        RETURNING id
        )
        SELECT * FROM UPDATER
        ;

        SELECT 'fixed EventReportPilotNationalCenterUsers' operation, COUNT(*) cnt FROM corrected_erpncu
        UNION
        SELECT 'fixed SessionReportPilots', COUNT(*) FROM corrected_srp
        UNION
        SELECT 'fixed EventReportPilots', COUNT(*) FROM corrected_erp
        ;

      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
