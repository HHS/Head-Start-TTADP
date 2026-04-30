const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'FindingCategories',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          name: {
            type: Sequelize.TEXT,
            allowNull: false,
            unique: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          deletedAt: {
            allowNull: true,
            type: Sequelize.DATE,
          },
        },
        { transaction }
      );

      await queryInterface.addColumn(
        'Citations',
        'findingCategoryId',
        {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        { transaction }
      );

      await queryInterface.addConstraint('Citations', {
        fields: ['findingCategoryId'],
        type: 'foreign key',
        name: 'citations_finding_category_id_fk',
        references: { table: 'FindingCategories', field: 'id' },
        onDelete: 'SET NULL',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeConstraint('Citations', 'citations_finding_category_id_fk', {
        transaction,
      });
      await queryInterface.removeColumn('Citations', 'findingCategoryId', { transaction });
      await queryInterface.dropTable('FindingCategories', { transaction });
    });
  },
};
