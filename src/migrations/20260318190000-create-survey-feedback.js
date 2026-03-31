const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'FeedbackSurveys',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          regionId: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          userRoles: {
            type: Sequelize.ARRAY(Sequelize.STRING),
            allowNull: false,
            defaultValue: [],
          },
          pageId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          response: {
            type: Sequelize.ENUM('yes', 'no'),
            allowNull: false,
          },
          comment: {
            type: Sequelize.TEXT,
            allowNull: true,
          },
          submittedAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        },
        { transaction },
      );

      await queryInterface.addIndex('FeedbackSurveys', ['pageId'], {
        name: 'feedback_surveys_page_id_idx',
        transaction,
      });

      await queryInterface.addIndex('FeedbackSurveys', ['regionId'], {
        name: 'feedback_surveys_region_id_idx',
        transaction,
      });

      await queryInterface.addIndex('FeedbackSurveys', ['submittedAt'], {
        name: 'feedback_surveys_submitted_at_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeIndex('FeedbackSurveys', 'feedback_surveys_page_id_idx', { transaction });
      await queryInterface.removeIndex('FeedbackSurveys', 'feedback_surveys_region_id_idx', { transaction });
      await queryInterface.removeIndex('FeedbackSurveys', 'feedback_surveys_submitted_at_idx', { transaction });
      await queryInterface.dropTable('FeedbackSurveys', { transaction });
    });
  },
};
