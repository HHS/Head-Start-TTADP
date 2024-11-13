const { prepMigration, dropAndRecreateEnum } = require('../lib/migration');
const { CREATION_METHOD } = require('../constants');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await dropAndRecreateEnum(
        queryInterface,
        transaction,
        'enum_GoalTemplates_creationMethod',
        'GoalTemplates',
        'creationMethod',
        [CREATION_METHOD.AUTOMATIC, CREATION_METHOD.CURATED, CREATION_METHOD.SYSTEM_GENERATED],
        'text',
        false,
      );

      // Update the creationMethod for the goal template with the monitoring goal name.
      const monitoringTemplateName = '(Monitoring) The recipient will develop and implement a QIP/CAP to address monitoring findings.';

      // Update the creationMethod to SYSTEM_CREATED for the monitoring goal template.
      await queryInterface.sequelize.query(`
        UPDATE "GoalTemplates"
        SET "creationMethod" = '${CREATION_METHOD.SYSTEM_GENERATED}'::"enum_GoalTemplates_creationMethod"
        WHERE "templateName" = '${monitoringTemplateName}';
    `, { transaction });
    });
  },

  async down() {
    // no rollbacks
  },
};
