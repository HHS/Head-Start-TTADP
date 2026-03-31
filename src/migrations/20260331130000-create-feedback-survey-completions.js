const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'FeedbackSurveyCompletions',
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
          },
          pageId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          completedAt: {
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

      await queryInterface.addIndex('FeedbackSurveyCompletions', ['userId', 'pageId'], {
        name: 'feedback_survey_completions_user_page_unique_idx',
        unique: true,
        transaction,
      });

      await queryInterface.addIndex('FeedbackSurveyCompletions', ['pageId'], {
        name: 'feedback_survey_completions_page_id_idx',
        transaction,
      });
    });
  },

  async down(queryInterface) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.removeIndex(
        'FeedbackSurveyCompletions',
        'feedback_survey_completions_user_page_unique_idx',
        { transaction },
      );
      await queryInterface.removeIndex(
        'FeedbackSurveyCompletions',
        'feedback_survey_completions_page_id_idx',
        { transaction },
      );
      await queryInterface.dropTable('FeedbackSurveyCompletions', { transaction });
    });
  },
};
