const {
  CLOSE_SUSPEND_REASONS,
  GOAL_CLOSE_REASONS,
  GOAL_SUSPEND_REASONS,
  GOAL_SOURCES,
  TRAINING_REPORT_STATUSES,
} = require('@ttahub/common');
const {
  prepMigration,
  removeTables,
  addColumnToTables,
  removeColumnFromTables,
} = require('../lib/migration');

const {
  REPORT_TYPE,
  ENTITY_TYPE,
  GOAL_STATUS,
  OBJECTIVE_STATUS,
  OBJECTIVE_SUPPORT_TYPES,
  COLLABORATOR_APPROVAL_STATUSES,
  AUDIENCE,
  TRAINING_TYPE,
  NEXTSTEP_NOTETYPE,
  SOURCE_FIELD,
} = require('../constants');

module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      /**
       *  create new tables for new structure:
       * - Reports-
       *  - ReportNationalCenters-
       *  - ReportReasons-
       *  - ReportTargetPopulations-
       *  - ReportTrainingEvents-
       *  - ReportTrainingSessions-
       *  - ReportApprovals-
       *  - ReportAudiences
       *  - ReportRecipients-
       *  - ReportCollaborators-
       *    - ReportCollaboratorTypes-
       *    - ReportCollaboratorRoles-
       *  - ReportNextSteps
       *  - ReportNextStepResources
       *  - ReportResources-
       *  - ReportFiles-
       *  - ReportGoalTemplates-
       *    - ReportGoalTemplateResources-
       *  - ReportGoals-
       *    - ReportGoalFieldResponse---
       *    - ReportGoalResources-
       *  - ReportObjectiveTemplates-
       *    - ReportObjectiveTemplateFiles
       *    - ReportObjectiveTemplateResources
       *    - ReportObjectiveTemplateTopics
       *    - ReportObjectiveTemplateTrainers
       *  - ReportObjectives-
       *    - ReportObjectiveFiles-
       *    - ReportObjectiveResources-
       *    - ReportObjectiveTopics-
       *    - ReportObjectiveTrainers
       *  - ReportParticipation -
       *    - ReportParticipationParticipants
       *  - ReportImports
       *  - ReportPageStates
       *
       * additional tables needed to maintain quality data over time and maintain FOIA:
       * - ValidFor-
       * - Statuses-
       * - Reasons-
       * - TargetPopulations-
       * - CollaboratorTypes-
       * - SupportTypes -
       * - Participants -
       * - Audiences -
       *
       *  additional changes to tables that need additional columns to maintain quality
       *  data over time and maintain FOIA:
       * - GoalTemplates - isFoiaable
       * - GoalTemplateResources - isFoiaable
       * - GoalTemplateFieldPrompts - isFoiaable
       * - Goals - isFoiaable
       * - GoalResources - isFoiaable
       * - GoalFieldResponses - isFoiaable
       * - ObjectiveTemplates - isFoiaable
       * - ObjectiveTemplateFiles - isFoiaable
       * - ObjectiveTemplateResources - isFoiaable
       * - ObjectiveTemplateTopics - isFoiaable
       * - Objectives - isFoiaable
       * - ObjectiveFiles - isFoiaable
       * - ObjectiveResources - isFoiaable
       * - ObjectiveTopics - isFoiaable
       *  */

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ValidFor', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        isReport: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
      }, { transaction });

      await queryInterface.sequelize.query(`
        INSERT INTO "ValidFor"
        ("name", "isReport", "createdAt", "updatedAt")
        SELECT
          t.name,
          t.name in (${Object.values(REPORT_TYPE).map((type) => `'${type}'`).join(',\n')}),
          current_timestamp,
          current_timestamp
        FROM UNNEST(ARRAY[
          ${Object.values(ENTITY_TYPE).map((type) => `'${type}'`).join(',\n')}
        ]) t(name)
       ;`, { transaction });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('Statuses', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        isTerminal: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          default: false,
        },
        ordinal: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Statuses',
            },
            key: 'id',
          },
        },
      }, { transaction });

      // TODO: need to add statuses for reports
      const seedStatuses = [
        {
          values: TRAINING_REPORT_STATUSES,
          validForName: ENTITY_TYPE.REPORT_TRAINING_EVENT,
          terminalStatus: TRAINING_REPORT_STATUSES.COMPLETE,
        },
        {
          values: TRAINING_REPORT_STATUSES,
          validForName: ENTITY_TYPE.REPORT_TRAINING_SESSION,
          terminalStatus: TRAINING_REPORT_STATUSES.COMPLETE,
        },
        {
          values: GOAL_STATUS,
          validForName: ENTITY_TYPE.GOAL,
          terminalStatus: GOAL_STATUS.CLOSED,
        },
        {
          values: OBJECTIVE_STATUS,
          validForName: ENTITY_TYPE.COMPLETE,
          terminalStatus: OBJECTIVE_STATUS.CLOSED,
        },
        {
          values: COLLABORATOR_APPROVAL_STATUSES,
          validForName: ENTITY_TYPE.COLLABORATOR,
          terminalStatus: COLLABORATOR_APPROVAL_STATUSES.APPROVED,
        },
      ];

      await Promise.all(seedStatuses.map(async ({
        values,
        validForName,
        terminalStatus,
      }) => queryInterface.sequelize.query(`
        INSERT INTO "Statuses"
        ("name", "validForId", "createdAt", "updatedAt", "isTerminal", "ordinal")
        SELECT
          s.name,
          vf.id,
          current_timestamp,
          current_timestamp,
          s.name = '${terminalStatus}',
          row_number() over (partition by vf.id)
        FROM "ValidFor" vf
        CROSS JOIN UNNEST(ARRAY[
          ${Object.values(values).map((status) => `'${status}'`).join(',\n')}
        ]) s(name)
        WHERE vf.name = '${validForName}'
        ;`, { transaction })));

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('SupportTypes', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'SupportTypes',
            },
            key: 'id',
          },
        },
      }, { transaction });

      await queryInterface.sequelize.query(`
        INSERT INTO "SupportTypes"
        ("name", "validForId", "createdAt", "updatedAt")
        SELECT
          s.name,
          vf.id,
          current_timestamp,
          current_timestamp
        FROM "ValidFor" vf
        CROSS JOIN UNNEST(ARRAY[
          ${OBJECTIVE_SUPPORT_TYPES.map((supportType) => `'${supportType}'`).join(',\n')}
        ]) s(name)
        WHERE vf.name = '${ENTITY_TYPE.OBJECTIVE}'
        ;`, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('Organizers', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Organizers',
            },
            key: 'id',
          },
        },
      }, { transaction });
      //---------------------------------------------------------------------------------
      await queryInterface.createTable('Audiences', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Audiences',
            },
            key: 'id',
          },
        },
      }, { transaction });

      await queryInterface.sequelize.query(`
      INSERT INTO "Audiences"
      ("name", "validForId", "createdAt", "updatedAt")
      SELECT
        s.name,
        vf.id,
        current_timestamp,
        current_timestamp
      FROM "ValidFor" vf
      CROSS JOIN UNNEST(ARRAY[
        ${Object.values(AUDIENCE).map((audience) => `'${audience}'`).join(',\n')}
      ]) s(name)
      WHERE vf.name = '${REPORT_TYPE.REPORT_TRAINING_EVENT}'
      ;`, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('Participants', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Participants',
            },
            key: 'id',
          },
        },
      }, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('Reports', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportTypeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        statusId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Statuses',
            },
            key: 'id',
          },
        },
        context: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        startDate: {
          allowNull: true,
          type: Sequelize.DATEONLY,
        },
        endDate: {
          allowNull: true,
          type: Sequelize.DATEONLY,
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

      //---------------------------------------------------------------------------------
      await queryInterface.addColumn('NationalCenters', 'deletedAt', {
        type: Sequelize.DATE,
        allowNull: true,
        default: null,
      }, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportNationalCenters', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        nationalCenterId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'NationalCenters',
            },
            key: 'id',
          },
        },
        actingAs: {
          type: Sequelize.ENUM([
            'trainer',
          ]),
          allowNull: false,
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

      await queryInterface.addIndex('ReportNationalCenters', ['reportId', 'nationalCenterId', 'actingAs'], { transaction });

      await queryInterface.addConstraint('ReportNationalCenters', {
        fields: ['reportId', 'nationalCenterId', 'actingAs'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('Reasons', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reasons',
            },
            key: 'id',
          },
        },
      }, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportReasons', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        reasonId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reasons',
            },
            key: 'id',
          },
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
      await queryInterface.addIndex('ReportReasons', ['reportId', 'reasonId'], { transaction });

      await queryInterface.addConstraint('ReportReasons', {
        fields: ['reportId', 'reasonId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('TargetPopulations', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'TargetPopulations',
            },
            key: 'id',
          },
        },
      }, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportTargetPopulations', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        targetPopulationId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'TargetPopulations',
            },
            key: 'id',
          },
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
      await queryInterface.addIndex('ReportTargetPopulations', ['reportId', 'targetPopulationId'], { transaction });

      await queryInterface.addConstraint('ReportTargetPopulations', {
        fields: ['reportId', 'targetPopulationId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportAudiences', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        audienceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Audiences',
            },
            key: 'id',
          },
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
      await queryInterface.addIndex('ReportAudiences', ['reportId', 'audienceId'], { transaction });

      await queryInterface.addConstraint('ReportAudiences', {
        fields: ['reportId', 'audienceId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportTrainingEvents', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        regionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Regions',
            },
            key: 'id',
          },
        },
        eventId: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        organizerId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Organizers',
            },
            key: 'id',
          },
        },
        trainingType: {
          type: Sequelize.ENUM(Object.values(TRAINING_TYPE)),
          allowNull: false,
          defaultValue: TRAINING_TYPE.SERIES,
        },
        vision: {
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
      await queryInterface.addIndex('ReportTrainingEvents', ['reportId', 'regionId'], { transaction });

      await queryInterface.addConstraint('ReportTrainingEvents', {
        fields: ['reportId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportTrainingSessions', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        reportTrainingEventId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        regionId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Regions',
            },
            key: 'id',
          },
        },
        name: {
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
      await queryInterface.addIndex('ReportTrainingSessions', ['reportId', 'regionId'], { transaction });

      await queryInterface.addConstraint('ReportTrainingSessions', {
        fields: ['reportId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      const REPORT_STATUSES = {
        DRAFT: 'draft',
        DELETED: 'deleted',
        SUBMITTED: 'submitted',
        APPROVED: 'approved',
        NEEDS_ACTION: 'needs_action',
      };

      await queryInterface.createTable('ReportApprovals', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        submissionStatus: {
          allowNull: false,
          type: Sequelize.DataTypes
            .ENUM(Object.values(REPORT_STATUSES)),
        },
        calculatedStatus: {
          allowNull: false,
          type: Sequelize.DataTypes
            .ENUM(Object.values(REPORT_STATUSES)),
        },
        firstSubmittedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        submittedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        approvedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
        createdAt: {
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });

      await queryInterface.addConstraint('ReportApprovals', {
        fields: ['reportId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportRecipients', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        grantId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Grants',
            },
            key: 'id',
          },
        },
        otherEntityId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'OtherEntities',
            },
            key: 'id',
          },
        },
        createdAt: {
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          type: Sequelize.DATE,
        },
      }, { transaction });
      await queryInterface.addIndex('ReportRecipients', ['reportId', 'grantId'], { transaction });
      await queryInterface.addIndex('ReportRecipients', ['reportId', 'otherEntityId'], { transaction });

      await queryInterface.addConstraint('ReportRecipients', {
        fields: ['reportId', 'grantId', 'otherEntityId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('CollaboratorTypes', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.STRING,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          default: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'CollaboratorTypes',
            },
            key: 'id',
          },
        },
      }, { transaction });

      await queryInterface.addConstraint('CollaboratorTypes', {
        fields: ['name', 'validForId'],
        type: 'unique',
        transaction,
      });

      await Promise.all([
        queryInterface.sequelize.query(`
          INSERT INTO "CollaboratorTypes"
          ("name", "validForId", "createdAt", "updatedAt")
          SELECT
            ct.name,
            vf.id,
            current_timestamp,
            current_timestamp
          FROM "ValidFor" vf
          CROSS JOIN UNNEST(ARRAY[
            'editor',
            'owner',
            'instantiator',
            'poc'
          ]) ct(name)
          WHERE vf.name = '${REPORT_TYPE.REPORT_TRAINING_EVENT}'
          ;`, { transaction }),
        queryInterface.sequelize.query(`
          INSERT INTO "CollaboratorTypes"
          ("name", "validForId", "createdAt", "updatedAt")
          SELECT
            ct.name,
            vf.id,
            current_timestamp,
            current_timestamp
          FROM "ValidFor" vf
          CROSS JOIN UNNEST(ARRAY[
            'editor',
            'owner',
            'instantiator',
            'poc'
          ]) ct(name)
          WHERE vf.name = '${REPORT_TYPE.REPORT_TRAINING_SESSION}'
          ;`, { transaction }),
      ]);

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportCollaborators', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        userId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Users',
            },
            key: 'id',
          },
        },
        statusId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Statuses',
            },
            key: 'id',
          },
        },
        note: {
          allowNull: true,
          type: Sequelize.TEXT,
        },
        createdAt: {
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          type: Sequelize.DATE,
        },
        updatedAt: {
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
          type: Sequelize.DATE,
        },
        deletedAt: {
          allowNull: true,
          type: Sequelize.DATE,
        },
      }, { transaction });
      await queryInterface.addIndex('ReportCollaborators', ['reportId', 'userId'], { transaction });

      await queryInterface.addConstraint('ReportCollaborators', {
        fields: ['reportId', 'userId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportCollaboratorTypes', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportCollaboratorId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportCollaborators',
            },
            key: 'id',
          },
        },
        collaboratorTypeId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'CollaboratorTypes',
            },
            key: 'id',
          },
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
      await queryInterface.addIndex('ReportCollaboratorTypes', ['reportCollaboratorId', 'collaboratorTypeId'], { transaction });

      await queryInterface.addConstraint('ReportCollaboratorTypes', {
        fields: ['reportCollaboratorId', 'collaboratorTypeId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportCollaboratorRoles', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportCollaboratorId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportCollaborators',
            },
            key: 'id',
          },
        },
        roleId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Roles',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportCollaboratorRoles', ['reportCollaboratorId', 'roleId'], { transaction });

      await queryInterface.addConstraint('ReportCollaboratorRoles', {
        fields: ['reportCollaboratorId', 'roleId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportNextSteps', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        note: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        noteType: {
          allowNull: false,
          type: Sequelize.ENUM(Object.values(NEXTSTEP_NOTETYPE)),
        },
        completedDate: {
          type: Sequelize.DATEONLY,
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
      }, { transaction });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        resourceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Resources',
            },
            key: 'id',
          },
        },
        tableName: {
          allowNull: false,
          type: Sequelize.TEXT,
        },
        columnName: {
          allowNull: true,
          type: Sequelize.TEXT,
        },
        tableId: {
          allowNull: false,
          type: Sequelize.BIGINT,
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
      await queryInterface.addIndex('ReportResources', ['reportId', 'resourceId'], { transaction });

      await queryInterface.addConstraint('ReportResources', {
        fields: ['reportId', 'resourceId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Files',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportFiles', ['reportId', 'fileId'], { transaction });

      await queryInterface.addConstraint('ReportFiles', {
        fields: ['reportId', 'fileId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportGoalTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        goalTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'GoalTemplates',
            },
            key: 'id',
          },
        },
        // TODO: do we need to cache the name to the template...yes
        templateName: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        timeframe: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        endDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        isActivelyEdited: {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
          allowNull: true,
        },
        ordinal: {
          type: Sequelize.INTEGER,
        },
        statusId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Statuses',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportGoalTemplates', ['reportId', 'goalTemplateId'], { transaction });
      await queryInterface.addIndex('ReportGoalTemplates', ['reportId', 'statusId'], { transaction });

      await queryInterface.addConstraint('ReportGoalTemplates', {
        fields: ['reportId', 'goalTemplateId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      const PROMPT_FIELD_TYPE = {
        MULTISELECT: 'multiselect',
      };

      await queryInterface.createTable('ReportGoalTemplateFieldPrompts', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportGoalTemplateId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportGoalTemplates',
            },
            key: 'id',
          },
        },
        goalTemplateFieldPromptId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'GoalTemplateFieldPrompts',
            },
            key: 'id',
          },
        },
        caution: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        hint: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ordinal: {
          type: Sequelize.INTEGER,
          allowNull: false,
        },
        title: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        prompt: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        fieldType: {
          type: Sequelize.ENUM(Object.values(PROMPT_FIELD_TYPE)),
        },
        options: {
          type: Sequelize.ARRAY(Sequelize.TEXT),
          allowNull: true,
        },
        validations: {
          type: Sequelize.JSON,
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
      }, { transaction });

      await queryInterface.addIndex('ReportGoalTemplateFieldPrompts', ['reportGoalTemplateId', 'goalTemplateFieldPromptId'], { transaction });

      await queryInterface.addConstraint('ReportGoalTemplateFieldPrompts', {
        fields: ['reportGoalTemplateId', 'goalTemplateFieldPromptId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('CloseSuspendReasons', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        validForId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ValidFor',
            },
            key: 'id',
          },
        },
        forClose: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        forSuspend: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.fn('NOW'),
        },
        deletedAt: {
          type: Sequelize.DATE,
          allowNull: true,
          defaultValue: null,
        },
        mapsTo: {
          type: Sequelize.INTEGER,
          allowNull: true,
          default: null,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'CloseSuspendReasons',
            },
            key: 'id',
          },
        },
      }, { transaction });

      await queryInterface.sequelize.query(`
        INSERT INTO "CloseSuspendReasons"
        ("name", "validForId", "forClose", "forSuspend", "createdAt", "updatedAt")
        SELECT
          csr.name,
          vf.id,
          csr.name IN (${GOAL_CLOSE_REASONS.map((gcr) => `'${gcr}'`).join(',\n')}),
          csr.name IN (${GOAL_SUSPEND_REASONS.map((gsr) => `'${gsr}'`).join(',\n')}),
          current_timestamp,
          current_timestamp
        FROM "ValidFor" vf
        CROSS JOIN UNNEST(ARRAY[${CLOSE_SUSPEND_REASONS.map((csr) => `'${csr}'`).join(',\n')}]) csr(name)
        WHERE vf.name = '${ENTITY_TYPE.GOAL}'
        OR vf.name = '${ENTITY_TYPE.OBJECTIVE}'
        ;`, { transaction });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportGoals', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        goalId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Goals',
            },
            key: 'id',
          },
        },
        name: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        statusId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Statuses',
            },
            key: 'id',
          },
        },
        timeframe: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        closeSuspendReasonId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'CloseSuspendReasons',
            },
            key: 'id',
          },
        },
        closeSuspendContext: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        endDate: {
          type: Sequelize.DATEONLY,
          allowNull: true,
        },
        ordinal: {
          type: Sequelize.INTEGER,
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
      await queryInterface.addIndex('ReportGoals', ['reportId', 'goalId'], { transaction });

      await queryInterface.addConstraint('ReportGoals', {
        fields: ['reportId', 'goalId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportGoalFieldResponses', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportGoalId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportGoals',
            },
            key: 'id',
          },
        },
        goalTemplateFieldPromptId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'GoalTemplateFieldPrompts',
            },
            key: 'id',
          },
        },
        response: {
          type: Sequelize.ARRAY(Sequelize.TEXT),
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
      }, { transaction });
      await queryInterface.addIndex('ReportGoalFieldResponses', ['reportGoalId', 'goalTemplateFieldPromptId'], { transaction });

      await queryInterface.addConstraint('ReportGoalFieldResponses', {
        fields: ['reportGoalId', 'goalTemplateFieldPromptId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        objectiveTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
        },
        reportGoalTemplateId: {
          allowNull: true,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportGoalTemplates',
            },
            key: 'id',
          },
        },
        supportTypeId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'SupportTypes',
            },
            key: 'id',
          },
        },
        templateTitle: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ttaProvided: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ordinal: {
          type: Sequelize.INTEGER,
        },
        statusId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Statuses',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplates', ['reportId', 'objectiveTemplateId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplates', ['reportId', 'reportGoalTemplateId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplates', ['reportId', 'statusId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveTemplates', {
        fields: ['reportId', 'objectiveTemplateId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTemplateFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportObjectiveTemplateId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportObjectiveTemplates',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        objectiveTemplateFileId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ObjectiveTemplateFiles',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplateFiles', ['reportObjectiveTemplateId', 'fileId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplateFiles', ['reportObjectiveTemplateId', 'objectiveTemplateFileId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveTemplateFiles', {
        fields: ['reportObjectiveTemplateId', 'fileId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTemplateTopics', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportObjectiveTemplateId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportObjectiveTemplates',
            },
            key: 'id',
          },
        },
        topicId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Topics',
            },
            key: 'id',
          },
        },
        objectiveTemplateTopicId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ObjectiveTemplateTopics',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplateTopics', ['reportObjectiveTemplateId', 'topicId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplateTopics', ['reportObjectiveTemplateId', 'objectiveTemplateTopicId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveTemplateTopics', {
        fields: ['reportObjectiveTemplateId', 'topicId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTemplateTrainers', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportObjectiveTemplateId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportObjectiveTemplates',
            },
            key: 'id',
          },
        },
        nationalCenterId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'NationalCenters',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplateTrainers', ['reportObjectiveTemplateId', 'nationalCenterId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveTemplateTrainers', {
        fields: ['reportObjectiveTemplateId', 'nationalCenterId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectives', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        objectiveId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
        },
        reportGoalId: {
          allowNull: true,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportGoals',
            },
            key: 'id',
          },
        },
        title: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        statusId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Statuses',
            },
            key: 'id',
          },
        },
        supportTypeId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'SupportTypes',
            },
            key: 'id',
          },
        },
        ttaProvided: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        ordinal: {
          type: Sequelize.INTEGER,
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
      await queryInterface.addIndex('ReportObjectives', ['reportId', 'objectiveId'], { transaction });
      await queryInterface.addIndex('ReportObjectives', ['reportId', 'reportGoalId'], { transaction });

      await queryInterface.addConstraint('ReportObjectives', {
        fields: ['reportId', 'objectiveId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveFiles', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportObjectiveId: {
          allowNull: false,
          type: Sequelize.BIGINT,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportObjectives',
            },
            key: 'id',
          },
        },
        fileId: {
          allowNull: false,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Files',
            },
            key: 'id',
          },
        },
        objectiveFileId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ObjectiveFiles',
            },
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
      }, { transaction });

      await queryInterface.addIndex('ReportObjectiveFiles', ['reportObjectiveId', 'fileId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveFiles', ['reportObjectiveId', 'objectiveFileId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveFiles', {
        fields: ['reportObjectiveId', 'fileId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTopics', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportObjectiveId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportObjectives',
            },
            key: 'id',
          },
        },
        topicId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Topics',
            },
            key: 'id',
          },
        },
        objectiveTopicId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ObjectiveTopics',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportObjectiveTopics', ['reportObjectiveId', 'topicId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveTopics', ['reportObjectiveId', 'objectiveTopicId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveTopics', {
        fields: ['reportObjectiveId', 'topicId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTrainers', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.BIGINT,
        },
        reportObjectiveId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportObjectives',
            },
            key: 'id',
          },
        },
        nationalCenterId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'NationalCenters',
            },
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
      }, { transaction });
      await queryInterface.addIndex('ReportObjectiveTrainers', ['reportObjectiveId', 'nationalCenterId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveTrainers', {
        fields: ['reportObjectiveId', 'nationalCenterId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportParticipation', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        participantCount: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        inpersonParticipantCount: {
          type: Sequelize.INTEGER,
          allowNull: true,
        },
        virtualParticipantCount: {
          type: Sequelize.INTEGER,
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

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportParticipationParticipants', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportParticipationId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'ReportParticipation',
            },
            key: 'id',
          },
        },
        participantId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Participants',
            },
            key: 'id',
          },
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

      await queryInterface.addIndex('ReportParticipationParticipants', ['reportParticipationId', 'participantId'], { transaction });

      await queryInterface.addConstraint('ReportParticipationParticipants', {
        fields: ['reportParticipationId', 'participantId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportImports', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        data: {
          type: Sequelize.JSONB,
          allowNull: false,
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

      //---------------------------------------------------------------------------------

      await queryInterface.createTable('ReportPageStates', {
        id: {
          type: Sequelize.BIGINT,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.BIGINT,
          allowNull: false,
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        pageState: {
          type: Sequelize.JSONB,
          allowNull: false,
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

      //---------------------------------------------------------------------------------
      const foiaableTables = [
        // Primary tables
        'Goals',
        'GoalTemplates',
        'Objectives',
        'ObjectiveTemplates',
        // Metadata tables
        'GoalTemplateResources',
        'GoalTemplateFieldPrompts',
        'GoalResources',
        'GoalFieldResponses',
        'ObjectiveTemplateFiles',
        'ObjectiveTemplateResources',
        'ObjectiveTemplateTopics',
        'ObjectiveFiles',
        'ObjectiveResources',
        'ObjectiveTopics',
      ];

      await addColumnToTables(
        queryInterface,
        transaction,
        'isFoiaable',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        foiaableTables,
      );

      await addColumnToTables(
        queryInterface,
        transaction,
        'isReferenced',
        {
          type: Sequelize.BOOLEAN,
          defaultValue: false,
        },
        foiaableTables,
      );
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const sessionSig = __filename;
      await prepMigration(queryInterface, transaction, sessionSig);

      await removeTables(
        queryInterface,
        transaction,
        [
          'Reasons',
          'TargetPopulations',
          'ReportReasons',
          'ReportTargetPopulations',
          'ReportTrainingEvents',
          'ReportTrainingSessions',
          'ReportApprovals',
          'ReportRecipients',
          'ReportCollaborators',
          'ReportCollaboratorRoles',
          'ReportResources',
          'ReportFiles',
          'ReportGoalTemplates',
          'ReportGoals',
          'ReportObjectiveFiles',
          'ReportObjectiveTopics',
          'ReportObjectives',
          'Reports',
        ],
      );

      const foiaableTables = [
        // Primary tables
        'Goals',
        'GoalTemplates',
        'Objectives',
        'ObjectiveTemplates',
        // Metadata tables
        'GoalTemplateResources',
        'GoalTemplateFieldPrompts',
        'GoalResources',
        'GoalFieldResponses',
        'ObjectiveTemplateFiles',
        'ObjectiveTemplateResources',
        'ObjectiveTemplateTopics',
        'ObjectiveFiles',
        'ObjectiveResources',
        'ObjectiveTopics',
      ];

      await removeColumnFromTables(
        queryInterface,
        transaction,
        'isFoiaable',
        foiaableTables,
      );

      await removeColumnFromTables(
        queryInterface,
        transaction,
        'isReferenced',
        foiaableTables,
      );
    },
  ),
};
