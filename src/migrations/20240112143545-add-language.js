const {
  prepMigration,
} = require('../lib/migration');

const LANGUAGES = [
  'English',
  'Spanish',
];

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);

      await queryInterface.addColumn('ActivityReports', 'language', {
        type: Sequelize.DataTypes.ENUM(LANGUAGES),
        allowNull: true,
      }, { transaction });
    });
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await prepMigration(queryInterface, transaction, __filename);
      await queryInterface.removeColumn('ActivityReports', 'language', { transaction });
    });
  },
};
