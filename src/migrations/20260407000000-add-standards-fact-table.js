const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeColumn('Citations', 'guidance_category', { transaction });

      await queryInterface.createTable('Standards', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        citationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        guidance_category: {
          type: Sequelize.TEXT,
          allowNull: true,
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
      }, { transaction });

      await queryInterface.addIndex('Standards', ['citationId', 'guidance_category'], {
        unique: true,
        name: 'standards_citation_id_guidance_category_uniq',
        transaction,
      });

      await queryInterface.addConstraint('Standards', {
        fields: ['citationId'],
        type: 'foreign key',
        name: 'standards_citation_id_fk',
        references: { table: 'Citations', field: 'id' },
        onDelete: 'CASCADE',
        transaction,
      });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.dropTable('Standards', { transaction });

      await queryInterface.addColumn('Citations', 'guidance_category', {
        type: Sequelize.TEXT,
        allowNull: true,
      }, { transaction });
    });
  },
};
