const { prepMigration } = require('../lib/migration')

module.exports = {
  up: async (queryInterface) =>
    queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename)
      await queryInterface.sequelize.query(
        /* sql */ `
        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["PFCE"]'::jsonb, false)
        WHERE id = 7;

        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["PFMO"]'::jsonb, false)
        WHERE id IN (3, 5);

        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["HBHS"]'::jsonb, false)
        WHERE id = 6;

        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["DTL"]'::jsonb, false)
        WHERE id = 8;

      `,
        { transaction }
      )
    }),

  down: async (queryInterface) =>
    queryInterface.sequelize.transaction(async () => {
      // no down
    }),
}
