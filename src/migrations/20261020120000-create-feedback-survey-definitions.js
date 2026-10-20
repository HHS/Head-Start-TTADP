const { prepMigration, removeTables } = require('../lib/migration');

const LEGACY_QUESTION = 'Did you find this page helpful?';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable(
        'FeedbackSurveyDefinitions',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          pageId: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          startDate: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          // NULL end date = open until an admin closes it manually
          endDate: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          status: {
            type: Sequelize.ENUM('active', 'closed'),
            allowNull: false,
            defaultValue: 'active',
          },
          closedAt: {
            type: Sequelize.DATE,
            allowNull: true,
          },
          createdBy: {
            type: Sequelize.INTEGER,
            allowNull: true,
            references: { model: { tableName: 'Users' }, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'SET NULL',
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

      await queryInterface.addIndex('FeedbackSurveyDefinitions', ['pageId', 'status'], {
        name: 'feedback_survey_definitions_page_id_status_idx',
        transaction,
      });

      await queryInterface.createTable(
        'FeedbackSurveyQuestions',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          surveyId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: { model: { tableName: 'FeedbackSurveyDefinitions' }, key: 'id' },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          questionText: {
            type: Sequelize.TEXT,
            allowNull: false,
          },
          order: {
            type: Sequelize.INTEGER,
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

      await queryInterface.addIndex('FeedbackSurveyQuestions', ['surveyId'], {
        name: 'feedback_survey_questions_survey_id_idx',
        transaction,
      });

      await queryInterface.addColumn('FeedbackSurveys', 'surveyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: { tableName: 'FeedbackSurveyDefinitions' }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });

      await queryInterface.addColumn('FeedbackSurveys', 'questionId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: { tableName: 'FeedbackSurveyQuestions' }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL',
      }, { transaction });

      await queryInterface.addIndex('FeedbackSurveys', ['surveyId'], {
        name: 'feedback_surveys_survey_id_idx',
        transaction,
      });

      await queryInterface.addColumn('FeedbackSurveyCompletions', 'surveyId', {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: { model: { tableName: 'FeedbackSurveyDefinitions' }, key: 'id' },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE',
      }, { transaction });

      // Backfill: one closed legacy survey per page that already has responses or completions
      await queryInterface.sequelize.query(`
        WITH pages AS (
          SELECT "pageId", MIN("submittedAt") AS first_at, MAX("submittedAt") AS last_at
          FROM "FeedbackSurveys"
          GROUP BY "pageId"
          UNION ALL
          SELECT "pageId", MIN("completedAt"), MAX("completedAt")
          FROM "FeedbackSurveyCompletions"
          GROUP BY "pageId"
        )
        INSERT INTO "FeedbackSurveyDefinitions"
          ("pageId", "startDate", "endDate", "status", "closedAt", "createdAt", "updatedAt")
        SELECT "pageId", MIN(first_at)::date, MAX(last_at)::date, 'closed', NOW(), NOW(), NOW()
        FROM pages
        GROUP BY "pageId";
      `, { transaction });

      await queryInterface.sequelize.query(`
        INSERT INTO "FeedbackSurveyQuestions" ("surveyId", "questionText", "order", "createdAt", "updatedAt")
        SELECT id, :question, 1, NOW(), NOW()
        FROM "FeedbackSurveyDefinitions";
      `, { transaction, replacements: { question: LEGACY_QUESTION } });

      await queryInterface.sequelize.query(`
        UPDATE "FeedbackSurveys" fs
        SET "surveyId" = d.id, "questionId" = q.id
        FROM "FeedbackSurveyDefinitions" d
        JOIN "FeedbackSurveyQuestions" q ON q."surveyId" = d.id
        WHERE fs."pageId" = d."pageId";
      `, { transaction });

      await queryInterface.sequelize.query(`
        UPDATE "FeedbackSurveyCompletions" c
        SET "surveyId" = d.id
        FROM "FeedbackSurveyDefinitions" d
        WHERE c."pageId" = d."pageId";
      `, { transaction });

      await queryInterface.changeColumn('FeedbackSurveyCompletions', 'surveyId', {
        type: Sequelize.INTEGER,
        allowNull: false,
      }, { transaction });

      await queryInterface.removeIndex(
        'FeedbackSurveyCompletions',
        'feedback_survey_completions_user_page_unique_idx',
        { transaction },
      );

      await queryInterface.addIndex('FeedbackSurveyCompletions', ['userId', 'surveyId'], {
        name: 'feedback_survey_completions_user_survey_unique_idx',
        unique: true,
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
        'feedback_survey_completions_user_survey_unique_idx',
        { transaction },
      );

      // Collapse completions back to one per user/page before restoring the old unique index
      await queryInterface.sequelize.query(`
        DELETE FROM "FeedbackSurveyCompletions" c
        USING "FeedbackSurveyCompletions" newer
        WHERE c."userId" = newer."userId"
          AND c."pageId" = newer."pageId"
          AND c.id < newer.id;
      `, { transaction });

      await queryInterface.addIndex('FeedbackSurveyCompletions', ['userId', 'pageId'], {
        name: 'feedback_survey_completions_user_page_unique_idx',
        unique: true,
        transaction,
      });

      await queryInterface.removeColumn('FeedbackSurveyCompletions', 'surveyId', { transaction });
      await queryInterface.removeIndex('FeedbackSurveys', 'feedback_surveys_survey_id_idx', { transaction });
      await queryInterface.removeColumn('FeedbackSurveys', 'questionId', { transaction });
      await queryInterface.removeColumn('FeedbackSurveys', 'surveyId', { transaction });
      // Questions reference definitions, so remove them first
      await removeTables(queryInterface, transaction, ['FeedbackSurveyQuestions']);
      await removeTables(queryInterface, transaction, ['FeedbackSurveyDefinitions']);
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_FeedbackSurveyDefinitions_status";',
        { transaction },
      );
    });
  },
};
