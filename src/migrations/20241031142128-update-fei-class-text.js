const { prepMigration } = require('../lib/migration');
const {
  FEI_PROD_GOAL_TEMPLATE_ID,
  CLASS_MONITORING_PROD_GOAL_TEMPLATE_ID,
} = require('../constants');

const UPDATED_MONITORING_TEXT = '(CLASS Monitoring) Grant recipient will improve teacher-child interactions (as measured by CLASS scores).';
const UPDATED_FEI_TEXT = '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment).';

module.exports = {
  up: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.sequelize.query(`
        UPDATE "GoalTemplates" 
          SET "templateName" = '${UPDATED_FEI_TEXT}',
              "hash" = md5('${UPDATED_FEI_TEXT}')
          WHERE id = ${FEI_PROD_GOAL_TEMPLATE_ID};

        UPDATE "GoalTemplates" 
            SET "templateName" = '${UPDATED_MONITORING_TEXT}', 
                "hash" = md5('${UPDATED_MONITORING_TEXT}')
            WHERE id = ${CLASS_MONITORING_PROD_GOAL_TEMPLATE_ID};

        UPDATE "Goals"
            SET "name" = '${UPDATED_FEI_TEXT}'
            WHERE "goalTemplateId" = ${FEI_PROD_GOAL_TEMPLATE_ID};

        UPDATE "Goals"
            SET "name" = '${UPDATED_MONITORING_TEXT}'
            WHERE "goalTemplateId" = ${CLASS_MONITORING_PROD_GOAL_TEMPLATE_ID};
        `, { transaction });
    },
  ),

  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      // no down here
    },
  ),
};
