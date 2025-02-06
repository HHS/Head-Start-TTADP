const { prepMigration } = require('../lib/migration');

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(
        'ALTER TABLE "GoalTemplates" DROP COLUMN IF EXISTS "deletedAt";',
      );
      await queryInterface.addColumn(
        'GoalTemplates',
        'deletedAt',
        {
          type: Sequelize.DATE,
          allowNull: true,
        },
        { transaction },
      );
      return queryInterface.sequelize.query(`
         UPDATE "Topics" SET "deletedAt" = NOW() WHERE "name" = 'Equity';
         UPDATE "GoalTemplates" SET "deletedAt" = NOW() WHERE "templateName" = '(DEIA) The recipient will implement comprehensive systems and services that promote diversity, equity, inclusion, accessibility, and belonging.';
       `, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.sequelize.query(
        'ALTER TABLE "GoalTemplates" DROP COLUMN IF EXISTS "deletedAt";',
      );
    });
  },
};
