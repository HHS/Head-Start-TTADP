const { query } = require('express');
const { prepMigration } = require('../lib/migration');

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.createTable('CollabReports', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        status: {
          type: Sequelize.ENUM(['draft', 'submitted', 'reviewed', 'needs_approval', 'approved']),
          allowNull: false,
          defaultValue: 'draft',
        },
        startDate: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        endDate: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        duration: {
          type: Sequelize.SMALLINT,
          allowNull: false,
          validate: {
            min: 0,
          },
        },
        isStateActivity: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        conductMethod: {
          type: Sequelize.ENUM(['in_person', 'virtual', 'email', 'phone']),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportActivityState', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        collabReportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'CollabReports',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        activityStateId: {
          type: Sequelize.STRING,
          allowNull: false,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportDataUsed', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        collabReportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'CollabReports',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        collabReportDatum: {
          type: Sequelize.ENUM([
            'census_data',
            'child_abuse_and_neglect',
            'child_safety',
            'child_family_health',
            'disabilities',
            'foster_care',
            'homelessness',
            'kids_count',
            'licensing_data',
            'ohs_monitoring',
            'pir',
            'tta_hub',
            'other',
          ]),
          allowNull: false,
        },
        collabReportDataOther: {
          type: Sequelize.STRING,
          allowNull: true,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportGoal', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        collabReportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'CollabReports',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        goalTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'GoalTemplates',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportReason', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        collabReportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'CollabReports',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        reasonId: {
          type: Sequelize.ENUM([
            'participate_work_groups',
            'support_coordination',
            'agg_regional_data',
            'develop_presentations',
          ]),
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportSpecialist', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        collabReportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'CollabReports',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        specialistId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Users',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportStep', {
        id: {
          type: Sequelize.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        collabReportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'CollabReports',
            key: 'id',
          },
          onDelete: 'CASCADE',
        },
        collabStepId: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        collabStepDetail: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        collabStepCompleteDate: {
          type: Sequelize.DATE,
          allowNull: false,
        },
        collabStepPriority: {
          type: Sequelize.SMALLINT,
          allowNull: false,
        },
      }, { transaction });
    });
  },

  async down(queryInterface, _) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.dropTable('ZALCollabReportStep', { transaction });
      await queryInterface.dropTable('CollabReportStep', { transaction });

      await queryInterface.dropTable('ZALCollabReportSpecialist', { transaction });
      await queryInterface.dropTable('CollabReportSpecialist', { transaction });

      await queryInterface.dropTable('ZALCollabReportReason', { transaction });
      await queryInterface.dropTable('CollabReportReason', { transaction });

      await queryInterface.dropTable('ZALCollabReportGoal', { transaction });
      await queryInterface.dropTable('CollabReportGoal', { transaction });

      await queryInterface.dropTable('ZALCollabReportDataUsed', { transaction });
      await queryInterface.dropTable('CollabReportDataUsed', { transaction });

      await queryInterface.dropTable('ZALCollabReportActivityState', { transaction });
      await queryInterface.dropTable('CollabReportActivityState', { transaction });

      await queryInterface.dropTable('ZALCollabReports', { transaction });
      await queryInterface.dropTable('CollabReports', { transaction });
    });
  },
};
