const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'SurveyFeedbacks',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          userId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Users',
              },
              key: 'id',
            },
            onDelete: 'CASCADE',
          },
          pageId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          rating: {
            type: Sequelize.INTEGER,
            allowNull: false,
          },
          comment: {
            type: Sequelize.TEXT,
            allowNull: false,
            defaultValue: '',
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

      await queryInterface.addIndex('SurveyFeedbacks', ['pageId'], {
        name: 'survey_feedbacks_page_id_idx',
        transaction,
      });

      await queryInterface.addIndex('SurveyFeedbacks', ['userId'], {
        name: 'survey_feedbacks_user_id_idx',
        transaction,
      });

      await queryInterface.addIndex('SurveyFeedbacks', ['submittedAt'], {
        name: 'survey_feedbacks_submitted_at_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeIndex('SurveyFeedbacks', 'survey_feedbacks_page_id_idx', { transaction });
      await queryInterface.removeIndex('SurveyFeedbacks', 'survey_feedbacks_user_id_idx', { transaction });
      await queryInterface.removeIndex('SurveyFeedbacks', 'survey_feedbacks_submitted_at_idx', { transaction });
      await queryInterface.dropTable('SurveyFeedbacks', { transaction });
    });
  },
};
