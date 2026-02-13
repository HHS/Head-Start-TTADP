/* eslint-disable no-useless-escape */
/* eslint-disable max-len */
const goalText =
  '(FEI) The recipient will eliminate and/or reduce underenrollment as part of the Full Enrollment Initiative (as measured by monthly reported enrollment)'

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const loggedUser = '0'
      const sessionSig = __filename
      const auditDescriptor = 'RUN MIGRATIONS'
      await queryInterface.sequelize.query(
        `SELECT
              set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
              set_config('audit.transactionId', NULL, TRUE) as "transactionId",
              set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
              set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction }
      )

      await queryInterface.createTable(
        'GoalTemplateFieldPrompts',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          goalTemplateId: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'GoalTemplates',
              },
              key: 'id',
            },
          },
          ordinal: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
          },
          title: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false,
          },
          prompt: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: false,
          },
          hint: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true,
          },
          caution: {
            type: Sequelize.DataTypes.TEXT,
            allowNull: true,
          },
          fieldType: {
            type: Sequelize.DataTypes.ENUM(['multiselect']),
          },
          options: {
            type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.TEXT),
            allowNull: true,
          },
          validations: {
            type: Sequelize.DataTypes.JSON,
            allowNull: true,
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
        { transaction }
      )

      await queryInterface.createTable(
        'GoalFieldResponses',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          goalId: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Goals',
              },
              key: 'id',
            },
          },
          goalTemplateFieldPromptId: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'GoalTemplateFieldPrompts',
              },
              key: 'id',
            },
          },
          response: {
            type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.TEXT),
            allowNull: true,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          onAR: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
          },
          onApprovedAR: {
            allowNull: false,
            type: Sequelize.BOOLEAN,
          },
        },
        { transaction }
      )

      await queryInterface.createTable(
        'ActivityReportGoalFieldResponses',
        {
          id: {
            type: Sequelize.INTEGER,
            allowNull: false,
            primaryKey: true,
            autoIncrement: true,
          },
          activityReportGoalId: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'ActivityReportGoals',
              },
              key: 'id',
            },
          },
          goalTemplateFieldPromptId: {
            type: Sequelize.DataTypes.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'GoalTemplateFieldPrompts',
              },
              key: 'id',
            },
          },
          response: {
            type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.TEXT),
            allowNull: true,
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
        { transaction }
      )

      // Add first curated template
      await queryInterface.sequelize.query(
        `INSERT INTO "GoalTemplates" (
          hash,
          "templateName",
          "regionId",
          "creationMethod",
          "createdAt",
          "updatedAt",
          "lastUsed",
          "templateNameModifiedAt"
        ) Values (
          MD5(TRIM('${goalText}')),
          '${goalText}',
          null,
          'Curated'::"enum_GoalTemplates_creationMethod",
          current_timestamp,
          current_timestamp,
          NULL,
          current_timestamp
        );`,
        { transaction }
      )

      const fieldTitle = 'FEI root cause'
      const fieldPrompt = 'Select FEI root cause'
      const fieldType = 'multiselect'
      const fieldOptions = ['Community Partnerships', 'Facilities', 'Family Circumstances', 'Other ECE Care Options', 'Workforce']
      const fieldValidations = {
        required: 'Select a root cause',
        rules: [
          {
            name: 'maxSelections',
            value: 2,
            message: 'You can only select 2 options',
          },
        ],
      }

      const goalTextQuery = `SELECT id FROM "GoalTemplates" WHERE "templateName" = '${goalText}'`

      // Add prompt to first curated template
      await queryInterface.sequelize.query(
        `INSERT INTO "GoalTemplateFieldPrompts" (
          "goalTemplateId",
          ordinal,
          "title",
          "prompt",
          "hint",
          "caution",
          "fieldType",
          "options",
          "validations",
          "createdAt",
          "updatedAt"
        ) Values (
          (${goalTextQuery}),
          1,
          TRIM('${fieldTitle}'),
          TRIM('${fieldPrompt}'),
          'Maximum of 2',
          'Each recipient should have an FEI root cause. If you''re not sure, please check their Recipient TTA Record and identify it there.',
          '${fieldType}',
          ARRAY[${fieldOptions.map((o) => `'${o}'`).join(',')}],
          '${JSON.stringify(fieldValidations)}'::JSON,
          current_timestamp,
          current_timestamp
        );`,
        { transaction }
      )
    })
  },
  down: async (queryInterface) => {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction }
      )
      await Promise.all(
        ['ActivityReportGoalFieldResponses', 'GoalFieldResponses', 'GoalTemplateFieldPrompts'].map(async (table) => {
          await queryInterface.sequelize.query(` SELECT "ZAFRemoveAuditingOnTable"('${table}');`, { raw: true, transaction })
          // Drop old audit log table
          await queryInterface.sequelize.query(`TRUNCATE TABLE "${table}";`, { transaction })
          await queryInterface.dropTable(`ZAL${table}`, { transaction })
          await queryInterface.dropTable(table, { transaction })
        })
      )
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction }
      )
      await queryInterface.sequelize.query(
        `DELETE FROM "GoalTemplates"
        WHERE hash = MD5(TRIM('${goalText}'))
        AND "creationMethod" = 'Curated'::"enum_GoalTemplates_creationMethod";
        `,
        { transaction }
      )
    })
  },
}
