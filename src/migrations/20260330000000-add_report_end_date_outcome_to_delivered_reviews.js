const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.addColumn('DeliveredReviews', 'report_end_date', {
        type: Sequelize.DATEONLY,
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('DeliveredReviews', 'outcome', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('DeliveredReviews', 'report_end_date', { transaction });
      await queryInterface.removeColumn('DeliveredReviews', 'outcome', { transaction });
    });
  },
};
