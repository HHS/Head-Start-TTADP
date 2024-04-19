const {
  prepMigration,
} = require('../lib/migration');

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.sequelize.query(/* sql */`
        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["PFCE"]'::jsonb, false)
        WHERE data -> 'objectiveTrainers' = '["PFCE: IST, Yvette Dominquez"]'::jsonb;

        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["PFMO"]'::jsonb, false)
        WHERE data -> 'objectiveTrainers' = '["PMFO: IST, Rob Pfeffer"]'::jsonb;

        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["PFMO"]'::jsonb, false)
        WHERE data -> 'objectiveTrainers' = '["PFMO: IST, Rob Pfeffer"]'::jsonb;

        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["HBHS"]'::jsonb, false)
        WHERE data -> 'objectiveTrainers' = '["HBHS: IST, Rebecca Timmen"]'::jsonb;

        UPDATE "SessionReportPilots" 
        SET data = jsonb_set(data, '{objectiveTrainers}', '["DTL"]'::jsonb, false)
        WHERE data -> 'objectiveTrainers' = '["DTL: IST, Beth Elbertson"]'::jsonb;

        SELECT DISTINCT data -> 'objectiveTrainers' FROM "SessionReportPilots";
      `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async () => {
      // no down
    },
  ),
};
