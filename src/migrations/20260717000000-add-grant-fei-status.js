const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);
      // Add columns feiHsStatus and feiEhsStatus to the Grants table.
      // These are imported from the fei_hs_status and fei_ehs_status fields in
      // HSES grant_award.xml.
      await queryInterface.addColumn(
        'Grants',
        'feiHsStatus',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'Grants',
        'feiEhsStatus',
        {
          type: Sequelize.STRING,
          allowNull: true,
        },
        { transaction }
      );
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('Grants', 'feiHsStatus', { transaction });
      await queryInterface.removeColumn('Grants', 'feiEhsStatus', { transaction });
    });
  },
};
