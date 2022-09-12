/**
 * this migration moves all the activity report to objective and activity report to goal
 * metadata into the activity report objective and activity report goal models
 *
 * Because an objective can have additional or less topics (for example) on an activity report
 * than it might when created on the RTR, we need to preserve that specific linkage between the
 * topics and the activity report (through the objective) so that data manipulation on one activity
 * report does not change an objective on another activity report
 *
 * This migration should account for and handle cleanly any disruption to existing data
 * relationships
 *
 * Summary of changes
 * 1) add goal metadata to activity report goals table
 * 2) add objective metadata to activity report objectives table
 * 3) add join tables between ActivityReportObjectives and ObjectiveResources, Files, Topics,
 *    and Roles, and update accordingly using existing data
 *
 */
module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      // Disable logging while doing mass updates
      try {
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.addColumn('ActivityReportGoals', 'name', {
          type: Sequelize.TEXT,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('ActivityReportGoals', 'status', {
          type: Sequelize.STRING,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('ActivityReportGoals', 'timeframe', {
          type: Sequelize.TEXT,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('ActivityReportGoals', 'closeSuspendReason', {
          type: Sequelize.ENUM([
            'Duplicate goal',
            'Recipient request',
            'TTA complete',
            'Key staff turnover / vacancies',
            'Recipient is not responding',
            'Regional Office request',
          ]),
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('ActivityReportGoals', 'closeSuspendContext', {
          type: Sequelize.TEXT,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('ActivityReportGoals', 'endDate', {
          type: Sequelize.DATE,
          allowNull: true,
        }, { transaction });

        await queryInterface.sequelize.query(
          `UPDATE ONLY "ActivityReportGoals" arg
          SET
            "name" = g."name",
            "status" = g."status",
            "endDate" = g."endDate",
            "timeframe" = g."timeframe",
            "closeSuspendReason" = g."closeSuspendReason"::text::"enum_ActivityReportGoals_closeSuspendReason",
            "closeSuspendContext" = g."closeSuspendContext"
          FROM "Goals" g
          WHERE arg."goalId" = g.id;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.addColumn('ActivityReportObjectives', 'title', {
          type: Sequelize.TEXT,
          allowNull: true,
        }, { transaction });

        await queryInterface.addColumn('ActivityReportObjectives', 'status', {
          type: Sequelize.STRING,
          allowNull: true,
        }, { transaction });

        await queryInterface.sequelize.query(
          ` UPDATE ONLY "ActivityReportObjectives" aro
          SET
            "title" = o."title",
            "status" = o.status
          FROM "Objectives" o
          WHERE aro."objectiveId" = o.id;`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        // Enable logging while doing structural updates
        await queryInterface.sequelize.query(
          `
          SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
          `,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.addConstraint('ActivityReportObjectiveFiles', {
          fields: ['activityReportObjectiveId', 'fileId'],
          type: 'unique',
          transaction,
        });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.createTable('ActivityReportObjectiveResources', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          activityReportObjectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'ActivityReportObjectives',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          userProvidedUrl: {
            type: Sequelize.STRING,
            allowNull: false,
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        }, { transaction });

        await queryInterface.sequelize.query(
          `INSERT INTO "ActivityReportObjectiveResources"
          (
            "userProvidedUrl",
            "activityReportObjectiveId",
            "createdAt",
            "updatedAt"
          )
          SELECT
            r."userProvidedUrl",
            aro.id "activityReportObjectiveId",
            aro."updatedAt" "createdAt",
            aro."updatedAt" "updatedAt"
          FROM "ActivityReportObjectives" aro
          JOIN "ObjectiveResources" r
          ON aro."objectiveId" = r."objectiveId";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.createTable('ActivityReportObjectiveRoles', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          activityReportObjectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'ActivityReportObjectives',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          roleId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Roles',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        }, { transaction });

        await queryInterface.addConstraint('"ActivityReportObjectiveRoles"', {
          fields: ['activityReportObjectiveId', 'roleId'],
          type: 'unique',
          transaction,
        });

        await queryInterface.sequelize.query(
          `INSERT INTO "ActivityReportObjectiveRoles"
          (
            "roleId",
            "activityReportObjectiveId",
            "createdAt",
            "updatedAt"
          )
          SELECT
            r."roleId",
            aro.id "activityReportObjectiveId",
            aro."updatedAt" "createdAt",
            aro."updatedAt" "updatedAt"
          FROM "ActivityReportObjectives" aro
          JOIN "ObjectiveRoles" r
          ON aro."objectiveId" = r."objectiveId";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.createTable('ActivityReportObjectiveTopics', {
          id: {
            allowNull: false,
            autoIncrement: true,
            primaryKey: true,
            type: Sequelize.INTEGER,
          },
          activityReportObjectiveId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'ActivityReportObjectives',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          topicId: {
            type: Sequelize.INTEGER,
            allowNull: false,
            references: {
              model: {
                tableName: 'Topics',
              },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
          },
        }, { transaction });

        await queryInterface.addConstraint('"ActivityReportObjectiveTopics"', {
          fields: ['activityReportObjectiveId', 'topicId'],
          type: 'unique',
          transaction,
        });

        await queryInterface.sequelize.query(
          `INSERT INTO "ActivityReportObjectiveTopics"
          (
            "topicId",
            "activityReportObjectiveId",
            "createdAt",
            "updatedAt"
          )
          SELECT
            ot."topicId",
            aro.id "activityReportObjectiveId",
            aro."updatedAt" "createdAt",
            aro."updatedAt" "updatedAt"
          FROM "ActivityReportObjectives" aro
          JOIN "ObjectiveTopics" ot
          ON aro."objectiveId" = ot."objectiveId";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      try {
        const loggedUser = '0';
        // const transactionId = '';
        const sessionSig = __filename;
        const auditDescriptor = 'RUN MIGRATIONS';
        await queryInterface.sequelize.query(
          `SELECT
            set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
            set_config('audit.transactionId', NULL, TRUE) as "transactionId",
            set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
            set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
          { transaction },
        );
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }

      try {
        await queryInterface.removeColumn('ActivityReportGoals', 'status', { transaction });
        await queryInterface.removeColumn('ActivityReportObjectives', 'status', { transaction });
        await queryInterface.dropTable('ActivityReportObjectiveResources', { transaction });
        await queryInterface.dropTable('ActivityReportObjectiveRoles', { transaction });
        await queryInterface.dropTable('ActivityReportObjectiveTopics', { transaction });
      } catch (err) {
        console.error(err); // eslint-disable-line no-console
        throw (err);
      }
    },
  ),
};
