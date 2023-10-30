const {
  prepMigration,
} = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.createTable(
        'SimScoreCaches',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          recipient_id: { allowNull: false, type: Sequelize.INTEGER },
          goal1: { allowNull: false, type: Sequelize.INTEGER },
          goal2: { allowNull: false, type: Sequelize.INTEGER },
          score: { allowNull: false, type: Sequelize.DOUBLE },
          createdAt: { allowNull: false, type: Sequelize.DATE },
          updatedAt: { allowNull: false, type: Sequelize.DATE },
        },
      );
    });
  },
  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      await queryInterface.dropTable('SimScoreCaches', { transaction });
    });
  },
};
