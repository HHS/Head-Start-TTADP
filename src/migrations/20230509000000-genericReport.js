module.exports = {
  up: async (queryInterface, Sequelize) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const loggedUser = '0';
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

      /**
       *  create new tables for new structure:
       * - Reports
       *  - ReportNationalCenters
       *  - ReportReasons
       *  - ReportTargetPopulations
       *  - EventReports
       *  - SessionReports
       *  - ReportApprovals
       *  - ReportRecipients
       *  - ReportCollaborators
       *    - ReportCollaboratorTypes
       *    - ReportCollaboratorRoles
       *  - ReportResources
       *  - ReportFiles
       *  - ReportGoalTemplates
       *    - ReportGoalTemplateResources
       *  - ReportGoals
       *    - ReportGoalResources
       *  - ReportObjectiveTemplates
       *    - ReportObjectiveTemplateFiles
       *    - ReportObjectiveTemplateResources
       *    - ReportObjectiveTemplateTopics
       *  - ReportObjectives
       *    - ReportObjectiveFiles
       *    - ReportObjectiveResources
       *    - ReportObjectiveTopics
       *
       * additional tables needed to maintain quality data over time and maintain FOIA:
       * - Statuses
       * - NationalCenters
       * - Reasons
       * - TargetPopulations
       * - CollaboratorTypes
       *  */

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('Statuses', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.DataTypes.TEXT,
          allowNull: false,
        },
        validFor: {
          type: Sequelize.DataTypes.ENUM([
            'report.event',
            'report.session',
          ]),
          allowNull: false,
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
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'Statuses',
            },
            key: 'id',
          },
        },
      }, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('Reports', {
        id: {
          type: Sequelize.BIGINTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportType: {
          type: Sequelize.DataTypes.ENUM([
            'report.event',
            'report.session',
          ]),
        },
        statusId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Statuses',
            },
            key: 'id',
          },
        },
        context: {
          type: Sequelize.DataTypes.TEXT,
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
      await queryInterface.createTable('NationalCenters', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        name: {
          type: Sequelize.DataTypes.TEXT,
          allowNull: false,
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
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'Reasons',
            },
            key: 'id',
          },
        },
      }, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportNationalCenters', {
        id: {
          type: Sequelize.BIGINTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        nationalCenterId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'NationalCenters',
            },
            key: 'id',
          },
        },
        actingAs: {
          type: Sequelize.DataTypes.ENUM([
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
          type: Sequelize.DataTypes.TEXT,
          allowNull: false,
        },
        validFor: {
          type: Sequelize.DataTypes.ENUM([
            'report.event',
            'report.session',
          ]),
          allowNull: false,
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
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true,
          default: null,
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
          type: Sequelize.BIGINTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        reasonId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
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
          type: Sequelize.DataTypes.TEXT,
          allowNull: false,
        },
        reportType: {
          type: Sequelize.DataTypes.ENUM([
            'event',
            'session',
          ]),
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
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'Reasons',
            },
            key: 'id',
          },
        },
      }, { transaction });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportTargetPopulations', {
        id: {
          type: Sequelize.BIGINTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        targetPopulationId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
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
      const TRAINING_TYPE = {
        SERIES: 'series',
      };

      const AUDIENCE = {
        RECIPIENTS: 'Recipients',
        TTA_SPECIALISTS: 'TTA specialists',
        FEDERAL_STAFF: 'Federal staff',
      };

      const ORGANIZER = {
        REGIONAL_W_NC: 'Regional w/NC',
        REGIONAL_WO_NC: 'Regional w/o NC',
        IST: 'IST',
      };

      await queryInterface.createTable('EventReports', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        regionId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Regions',
            },
            key: 'id',
          },
        },
        name: {
          type: Sequelize.DataTypes.TEXT,
          allowNull: true,
        },
        organizer: {
          type: Sequelize.DataTypes.ENUM(Object.values(ORGANIZER)),
          allowNull: false,
        },
        audience: {
          type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(Object.values(AUDIENCE))),
          allowNull: false,
        },
        trainingType: {
          type: Sequelize.DataTypes.ENUM(Object.values(TRAINING_TYPE)),
          allowNull: false,
          defaultValue: TRAINING_TYPE.SERIES,
        },
        vision: {
          type: Sequelize.DataTypes.TEXT,
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
      await queryInterface.addIndex('EventReports', ['reportId', 'regionId'], { transaction });

      await queryInterface.addConstraint('EventReports', {
        fields: ['reportId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('SessionReports', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        eventReportId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Reports',
            },
            key: 'id',
          },
        },
        regionId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Regions',
            },
            key: 'id',
          },
        },
        name: {
          type: Sequelize.DataTypes.TEXT,
          allowNull: true,
        },
        inpersonParticipants: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true,
        },
        virtualParticipants: {
          type: Sequelize.DataTypes.INTEGER,
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
      await queryInterface.addIndex('SessionReports', ['reportId', 'regionId'], { transaction });

      await queryInterface.addConstraint('SessionReports', {
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
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          allowNull: true,
          type: Sequelize.DataTypes
            .ENUM(Object.values(REPORT_STATUSES)),
        },
        firstSubmittedAt: {
          allowNull: true,
          type: Sequelize.DataTypes.DATE,
        },
        submittedAt: {
          allowNull: true,
          type: Sequelize.DataTypes.DATE,
        },
        approvedAt: {
          allowNull: true,
          type: Sequelize.DataTypes.DATE,
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
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          type: Sequelize.DataTypes.TEXT,
          allowNull: false,
        },
        validFor: {
          type: Sequelize.DataTypes.ENUM([
            'report.event',
            'report.session',
          ]),
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
          type: Sequelize.DataTypes.INTEGER,
          allowNull: true,
          default: null,
          references: {
            model: {
              tableName: 'Reasons',
            },
            key: 'id',
          },
        },
      }, { transaction });

      await queryInterface.addConstraint('CollaboratorTypes', {
        fields: ['name', 'validFor'],
        type: 'unique',
        transaction,
      });

      await queryInterface.sequelize.query(`
        INSERT INTO "CollaboratorTypes"
        ("name", "validFor", "createdAt", "updatedAt")
        VALUES
        ('editor', 'report.event', current_timestamp, current_timestamp),
        ('owner', 'report.event', current_timestamp, current_timestamp),
        ('instantiator', 'report.event', current_timestamp, current_timestamp),
        ('approver', 'report.event', current_timestamp, current_timestamp),
        ('poc', 'report.event', current_timestamp, current_timestamp),
        ('editor', 'report.session', current_timestamp, current_timestamp),
        ('owner', 'report.session', current_timestamp, current_timestamp),
        ('instantiator', 'report.session', current_timestamp, current_timestamp),
        ('approver', 'report.session', current_timestamp, current_timestamp),
        ('poc', 'report.session', current_timestamp, current_timestamp);
      `, { transaction });

      //---------------------------------------------------------------------------------
      const APPROVAL_STATUSES = {
        APPROVAL_REQUESTED: 'approval_requested',
        NEEDS_ACTION: 'needs_action',
        APPROVED: 'approved',
      };

      await queryInterface.createTable('ReportCollaborators', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          onDelete: 'CASCADE',
          references: {
            model: {
              tableName: 'Users',
            },
            key: 'id',
          },
        },
        status: {
          allowNull: true,
          type: Sequelize.DataTypes.ENUM(Object.values(APPROVAL_STATUSES)),
        },
        note: {
          allowNull: true,
          type: Sequelize.DataTypes.TEXT,
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
          type: Sequelize.BIGINTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportCollaboratorId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ReportCollaborators',
            },
            key: 'id',
          },
        },
        collaboratorTypeId: {
          type: Sequelize.DataTypes.INTEGER,
          allowNull: false,
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
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportCollaboratorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
          allowNull: true,
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
      const NEXTSTEP_NOTETYPE = {
        SPECIALIST: 'SPECIALIST',
        RECIPIENT: 'RECIPIENT',
      };

      await queryInterface.createTable('ReportNextSteps', {
        id: {
          type: Sequelize.INTEGER,
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
        },
        reportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
          allowNull: true,
          type: Sequelize.DataTypes.ENUM(Object.values(NEXTSTEP_NOTETYPE)),
        },
        completedDate: {
          type: Sequelize.DATEONLY,
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
      }, { transaction });
      await queryInterface.addIndex('ReportNextSteps', ['reportId', 'nextStepId'], { transaction });

      await queryInterface.addConstraint('ReportNextSteps', {
        fields: ['reportId', 'nextStepId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      const SOURCE_FIELD = {
        REPORT: {
          CONTEXT: 'context',
          TRAININGDELIVERED: 'trainingDelivered', // via Session Report
          RESOURCE: 'resource',
        },
      };

      await queryInterface.createTable('ReportResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportId: {
          type: Sequelize.INTEGER,
          allowNull: false,
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
          references: {
            model: {
              tableName: 'Resources',
            },
            key: 'id',
          },
        },
        sourceFields: {
          allowNull: true,
          default: null,
          type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(
            Object.values(SOURCE_FIELD.REPORT),
          )),
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
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          references: {
            model: {
              tableName: 'GoalTemplates',
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

      await queryInterface.addConstraint('ReportGoalTemplates', {
        fields: ['reportId', 'goalTemplateId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportGoalTemplateResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportGoalTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ReportGoalTemplates',
            },
            key: 'id',
          },
        },
        resourceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Resources',
            },
            key: 'id',
          },
        },
        sourceFields: {
          allowNull: true,
          default: null,
          type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(
            Object.values(SOURCE_FIELD.REPORTGOALTEMPLATE),
          )),
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
      await queryInterface.addIndex('ReportGoalTemplateResources', ['reportGoalTemplateId', 'resourceId'], { transaction });

      await queryInterface.addConstraint('ReportGoalTemplateResources', {
        fields: ['reportGoalTemplateId', 'resourceId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportGoals', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
        status: {
          type: Sequelize.ENUM([
            'Draft',
            'Not Started',
            'In Progress',
            'Suspended',
            'Closed',
          ]),
          allowNull: true,
        },
        timeframe: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        closeSuspendReason: {
          type: Sequelize.ENUM([
            'Duplicate goal',
            'Recipient request',
            'TTA complete',
            'Key staff turnover / vacancies',
            'Recipient is not responding',
            'Regional Office request',
          ]),
          allowNull: true,
        },
        closeSuspendContext: {
          type: Sequelize.TEXT,
          allowNull: true,
        },
        endDate: {
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
      await queryInterface.addIndex('ReportGoals', ['reportId', 'goalId'], { transaction });

      await queryInterface.addConstraint('ReportGoals', {
        fields: ['reportId', 'goalId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportGoalResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportGoalId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ReportGoals',
            },
            key: 'id',
          },
        },
        resourceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Resources',
            },
            key: 'id',
          },
        },
        sourceFields: {
          allowNull: true,
          default: null,
          type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(
            Object.values(SOURCE_FIELD.REPORTGOAL),
          )),
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
      await queryInterface.addIndex('ReportGoalResources', ['reportGoalId', 'resourceId'], { transaction });

      await queryInterface.addConstraint('ReportGoalResources', {
        fields: ['reportGoalId', 'resourceId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTemplates', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          references: {
            model: {
              tableName: 'ObjectiveTemplates',
            },
            key: 'id',
          },
        },
        reportGoalId: {
          allowNull: true,
          type: Sequelize.INTEGER,
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
        status: {
          type: Sequelize.ENUM([
            'Not Started',
            'In Progress',
            'Suspended',
            'Complete',
          ]),
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
      await queryInterface.addIndex('ReportObjectives', ['reportId', 'objectiveTemplateId'], { transaction });
      await queryInterface.addIndex('ReportObjectives', ['reportId', 'reportObjectiveTemplateId'], { transaction });

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
          type: Sequelize.INTEGER,
        },
        reportObjectiveTemplateId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
      await queryInterface.createTable('ReportObjectiveTemplateResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportObjectiveTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ReportObjectiveTemplates',
            },
            key: 'id',
          },
        },
        resourceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Resources',
            },
            key: 'id',
          },
        },
        objectiveTemplateResourceId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'ObjectiveTemplateResources',
            },
            key: 'id',
          },
        },
        sourceFields: {
          allowNull: true,
          default: null,
          type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(
            Object.values(SOURCE_FIELD.REPORTOBJECTIVE),
          )),
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
      await queryInterface.addIndex('ReportObjectiveTemplateResources', ['reportObjectiveTemplateId', 'resourceId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveTemplateResources', ['reportObjectiveTemplateId', 'objectiveTemplateResourceId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveTemplateResources', {
        fields: ['reportObjectiveTemplateId', 'resourceId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTemplateTopics', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportObjectiveTemplateId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ReportObjectiveTemplates',
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
        objectiveTemplateTopicId: {
          allowNull: true,
          type: Sequelize.INTEGER,
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
      await queryInterface.createTable('ReportObjectives', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
          references: {
            model: {
              tableName: 'Objectives',
            },
            key: 'id',
          },
        },
        reportGoalId: {
          allowNull: true,
          type: Sequelize.INTEGER,
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
        status: {
          type: Sequelize.ENUM([
            'Not Started',
            'In Progress',
            'Suspended',
            'Complete',
          ]),
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
          type: Sequelize.INTEGER,
        },
        reportObjectiveId: {
          allowNull: false,
          type: Sequelize.INTEGER,
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
      await queryInterface.addIndex('ReportObjectives', ['reportObjectiveId', 'fileId'], { transaction });
      await queryInterface.addIndex('ReportObjectives', ['reportObjectiveId', 'objectiveFileId'], { transaction });

      await queryInterface.addConstraint('ReportObjectives', {
        fields: ['reportObjectiveId', 'fileId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveResources', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportObjectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ReportObjectives',
            },
            key: 'id',
          },
        },
        resourceId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'Resources',
            },
            key: 'id',
          },
        },
        objectiveResourceId: {
          allowNull: true,
          type: Sequelize.INTEGER,
          references: {
            model: {
              tableName: 'ObjectiveResources',
            },
            key: 'id',
          },
        },
        sourceFields: {
          allowNull: true,
          default: null,
          type: Sequelize.DataTypes.ARRAY(Sequelize.DataTypes.ENUM(
            Object.values(SOURCE_FIELD.REPORTOBJECTIVE),
          )),
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
      await queryInterface.addIndex('ReportObjectiveResources', ['reportObjectiveId', 'resourceId'], { transaction });
      await queryInterface.addIndex('ReportObjectiveResources', ['reportObjectiveId', 'objectiveResourceId'], { transaction });

      await queryInterface.addConstraint('ReportObjectiveResources', {
        fields: ['reportObjectiveId', 'resourceId'],
        type: 'unique',
        transaction,
      });

      //---------------------------------------------------------------------------------
      await queryInterface.createTable('ReportObjectiveTopics', {
        id: {
          allowNull: false,
          autoIncrement: true,
          primaryKey: true,
          type: Sequelize.INTEGER,
        },
        reportObjectiveId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: {
              tableName: 'ReportObjectives',
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
        objectiveTopicId: {
          allowNull: true,
          type: Sequelize.INTEGER,
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
    },
  ),
  down: async (queryInterface) => queryInterface.sequelize.transaction(
    async (transaction) => {
      const loggedUser = '0';
      const sessionSig = __filename;
      const auditDescriptor = 'REVERT MIGRATIONS';
      await queryInterface.sequelize.query(
        `SELECT
                set_config('audit.loggedUser', '${loggedUser}', TRUE) as "loggedUser",
                set_config('audit.transactionId', NULL, TRUE) as "transactionId",
                set_config('audit.sessionSig', '${sessionSig}', TRUE) as "sessionSig",
                set_config('audit.auditDescriptor', '${auditDescriptor}', TRUE) as "auditDescriptor";`,
        { transaction },
      );
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'DISABLE');
        `,
        { transaction },
      );

      /**
      *  Remove all new tables
      * - Reports
      *  - ReportReasons
      *  - ReportTargetPopulations
      *  - EventReports
      *  - SessionReports
      *  - ReportApprovals
      *  - ReportRecipients
      *  - ReportCollaborators
      *    - ReportCollaboratorRoles
      *  - ReportResources
      *  - ReportFiles
      *  - ReportGoalTemplates
      *    - ReportGoalTemplateResources
      *  - ReportGoals
      *    - ReportGoalResources
      *  - ReportObjectives
      *    - ReportObjectiveFiles
      *    - ReportObjectiveResources
      *    - ReportObjectiveTopics
      *
      * - Reasons
      * - TargetPopulations
      *  */
      await Promise.all([
        'Reasons',
        'TargetPopulations',
        'ReportReasons',
        'ReportTargetPopulations',
        'EventReports',
        'SessionReports',
        'ReportApprovals',
        'ReportRecipients',
        'ReportCollaborators',
        'ReportCollaboratorRoles',
        'ReportResources',
        'ReportFiles',
        'ReportGoalTemplateResources',
        'ReportGoalTemplates',
        'ReportGoalResources',
        'ReportGoals',
        'ReportObjectiveFiles',
        'ReportObjectiveResources',
        'ReportObjectiveTopics',
        'ReportObjectives',
        'Reports',
      ]
        .map(async (table) => {
          await queryInterface.sequelize.query(
            ` SELECT "ZAFRemoveAuditingOnTable"('${table}');`,
            { raw: true, transaction },
          );
          // Drop old audit log table
          await queryInterface.sequelize.query(`TRUNCATE TABLE "${table}";`, { transaction });
          await queryInterface.dropTable(`ZAL${table}`, { transaction });
          await queryInterface.dropTable(table, { transaction });
        }));
      await queryInterface.sequelize.query(
        `
        SELECT "ZAFSetTriggerState"(null, null, null, 'ENABLE');
        `,
        { transaction },
      );
    },
  ),
};
