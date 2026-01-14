const { Model } = require('sequelize');
const { REPORT_STATUSES, COLLAB_REPORT_PARTICIPANTS } = require('@ttahub/common');
const { sortBy } = require('lodash');
const { formatDate } = require('../lib/modelHelpers');
const { beforeUpdate } = require('./hooks/collabReport');

export default (sequelize, DataTypes) => {
  class CollabReport extends Model {
    static associate(models) {
      CollabReport.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'author',
      });
      CollabReport.belongsTo(models.User, {
        foreignKey: 'lastUpdatedById',
        as: 'lastUpdatedBy',
      });
      CollabReport.hasMany(models.CollabReportSpecialist, {
        foreignKey: 'collabReportId',
        as: 'collabReportSpecialists',
      });
      CollabReport.belongsToMany(models.User, {
        through: models.CollabReportSpecialist,
        foreignKey: 'collabReportId',
        otherKey: 'specialistId',
        as: 'collaboratingSpecialists',
      });
      CollabReport.hasMany(models.CollabReportReason, {
        foreignKey: 'collabReportId',
        as: 'reportReasons',
      });
      CollabReport.hasMany(models.CollabReportActivityState, {
        foreignKey: 'collabReportId',
        as: 'activityStates',
      });
      CollabReport.hasMany(models.CollabReportGoal, {
        foreignKey: 'collabReportId',
        as: 'reportGoals',
      });
      CollabReport.hasMany(models.CollabReportDataUsed, {
        foreignKey: 'collabReportId',
        as: 'dataUsed',
      });
      CollabReport.hasMany(models.CollabReportStep, {
        foreignKey: 'collabReportId',
        as: 'steps',
      });
      CollabReport.hasMany(models.CollabReportApprover, {
        foreignKey: 'collabReportId',
        as: 'approvers',
      });
      CollabReport.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });
    }
  }

  CollabReport.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      lastUpdatedById: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      regionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      name: {
        allowNull: true,
        type: DataTypes.STRING,
      },
      submissionStatus: {
        allowNull: false,
        type: DataTypes.ENUM([
          'draft',
          'submitted',
        ]),
      },
      participants: {
        allowNull: true,
        type: DataTypes.ARRAY(DataTypes.ENUM(COLLAB_REPORT_PARTICIPANTS)),
      },
      otherParticipants: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
      hasDataUsed: {
        allowNull: true,
        type: DataTypes.BOOLEAN,
      },
      otherDataUsed: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
      hasGoals: {
        allowNull: true,
        type: DataTypes.BOOLEAN,
      },
      calculatedStatus: {
        allowNull: true,
        type: DataTypes.ENUM([
          'draft',
          'submitted',
          'needs_action',
          'approved',
        ]),
      },
      startDate: {
        allowNull: true,
        type: DataTypes.DATEONLY,
        get: formatDate,
      },
      endDate: {
        allowNull: true,
        type: DataTypes.DATEONLY,
        get: formatDate,
      },
      duration: {
        allowNull: true,
        type: DataTypes.DOUBLE,
        validate: {
          min: 0,
        },
      },
      isStateActivity: {
        allowNull: true,
        type: DataTypes.BOOLEAN,
      },
      conductMethod: {
        allowNull: true,
        type: DataTypes.ENUM(['email', 'phone', 'in_person', 'virtual']),
      },
      description: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
      submittedAt: {
        allowNull: true,
        type: DataTypes.DATE,
      },
      // virtual columns
      creatorName: {
        type: DataTypes.VIRTUAL,
        get() {
          if (this.author) {
            return this.author.fullName;
          }
          return null;
        },
      },
      displayId: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.regionId) {
            return this.id;
          }
          return `R${this.regionId.toString().padStart(2, '0')}-CR-${this.id}`;
        },
      },
      link: {
        type: DataTypes.VIRTUAL,
        get() {
          if (this.calculatedStatus === REPORT_STATUSES.APPROVED) {
            return `/collaboration-reports/view/${this.id}`;
          }

          return `/collaboration-reports/${this.id}`;
        },
      },
      stepDetailsWithDates: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.steps) return null;
          return this.steps.map((step) => `${step.collabStepDetail} (${step.collabStepCompleteDate})`).join('\n');
        },
      },
      purpose: {
        type: DataTypes.VIRTUAL,
        get() {
          if (!this.reportReasons) return null;
          return this.reportReasons.join('\n');
        },
      },
      method: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.conductMethod;
        },
      },
      approvedAt: {
        type: DataTypes.VIRTUAL,
        get() {
          if (this.calculatedStatus !== REPORT_STATUSES.APPROVED) {
            return '';
          }

          if (!this.approvers || !this.approvers.length) {
            return '';
          }

          const max = sortBy(this.approvers, 'updatedAt');
          return max[max.length - 1].updatedAt;
        },
      },
    },
    {
      hooks: {
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      },
      sequelize,
      modelName: 'CollabReport',
      tableName: 'CollabReports',
      paranoid: true, // enables soft deletes with deletedAt
      timestamps: true, // enables createdAt and updatedAt
    },
  );

  return CollabReport;
};
