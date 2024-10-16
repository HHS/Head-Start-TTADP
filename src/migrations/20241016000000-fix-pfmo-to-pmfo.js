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
        WITH srp_objective_trainers AS (
        SELECT
          id srpid,
          jsonb_array_elements(data->'objectiveTrainers')->>0 ot
        FROM "SessionReportPilots"
        WHERE data->>'objectiveTrainers' LIKE '%PFMO%'
        ),
        regrouped_objective_trainers AS (
        SELECT
          srpid,
          jsonb_agg(to_jsonb(
            CASE ot WHEN 'PFMO' THEN 'PMFO' ELSE ot END
          )) regroup
        FROM srp_objective_trainers
        GROUP BY 1
        ),
        updater AS (
        UPDATE "SessionReportPilots"
        SET data = jsonb_set (
            data,
            '{objectiveTrainers}',
            regroup
          )
        FROM regrouped_objective_trainers
        WHERE srpid = id
        RETURNING id
        )
        SELECT * FROM UPDATER
        ;

      `);
    });
  },

  async down() {
    // no rollbacks
  },
};
