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
        regionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: 'Regions',
            key: 'id',
          },
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        submissionStatus: {
          type: Sequelize.ENUM(['draft', 'submitted']),
          allowNull: false,
        },
        calculatedStatus: {
          type: Sequelize.ENUM(['draft', 'submitted', 'needs_action', 'approved']),
          allowNull: true,
        },
        startDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        endDate: {
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        duration: {
          type: Sequelize.DOUBLE,
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
          type: Sequelize.ARRAY(Sequelize.ENUM(['in_person', 'virtual', 'email', 'phone'])),
          allowNull: false,
        },
        description: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        userId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        lastUpdatedById: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: 'Users',
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        submittedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportActivityStates', {
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
        activityStateCode: {
          type: Sequelize.STRING,
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
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportGoals', {
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportReasons', {
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
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportSpecialists', {
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
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.createTable('CollabReportSteps', {
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
          type: Sequelize.DATEONLY,
          allowNull: false,
        },
        collabStepPriority: {
          type: Sequelize.SMALLINT,
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
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });
    });
  },

  async down(queryInterface, _) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await queryInterface.dropTable('ZALCollabReportSteps', { transaction });
      await queryInterface.dropTable('CollabReportSteps', { transaction });

      await queryInterface.dropTable('ZALCollabReportSpecialists', { transaction });
      await queryInterface.dropTable('CollabReportSpecialists', { transaction });

      await queryInterface.dropTable('ZALCollabReportReasons', { transaction });
      await queryInterface.dropTable('CollabReportReasons', { transaction });

      await queryInterface.dropTable('ZALCollabReportGoals', { transaction });
      await queryInterface.dropTable('CollabReportGoals', { transaction });

      await queryInterface.dropTable('ZALCollabReportDataUsed', { transaction });
      await queryInterface.dropTable('CollabReportDataUsed', { transaction });

      await queryInterface.dropTable('ZALCollabReportActivityStates', { transaction });
      await queryInterface.dropTable('CollabReportActivityStates', { transaction });

      await queryInterface.dropTable('ZALCollabReports', { transaction });
      await queryInterface.dropTable('CollabReports', { transaction });
    });
  },
};
