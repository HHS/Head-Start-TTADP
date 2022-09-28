const { Op, Model } = require('sequelize');
const moment = require('moment');
// const { isEqual, uniqWith } = require('lodash');
const {
  REPORT_STATUSES,
  // USER_ROLES,
  COLLABORATOR_TYPES,
  ENTITY_TYPES,
} = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const {
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
  afterCreate,
  afterUpdate,
} = require('./hooks/activityReport');

// const generateCreatorNameWithRole = (ar) => {
//   const creatorName = ar.author ? ar.author.name : '';
//   let roles = '';
//   if (ar.creatorRole) {
//     roles = ar.creatorRole === 'TTAC' || ar.creatorRole === 'COR'
//      ? `, ${ar.creatorRole}`
//      : `, ${ar.creatorRole.split(' ').map((word) => word[0]).join('')}`;
//   }
//   return `${creatorName}${roles}`;
// };

module.exports = (sequelize, DataTypes) => {
  class ActivityReport extends Model {
    static associate(models) {
      ActivityReport.belongsTo(models.User, { foreignKey: 'lastUpdatedById', as: 'lastUpdatedBy', hooks: true });
      ActivityReport.hasMany(models.ActivityRecipient, { foreignKey: 'activityReportId', as: 'activityRecipients', hooks: true });
      ActivityReport.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region', hooks: true });
      ActivityReport.hasMany(models.ActivityReportFile, { foreignKey: 'activityReportId', as: 'reportFiles', hooks: true });
      ActivityReport.belongsToMany(models.File, {
        through: models.ActivityReportFile,
        foreignKey: 'activityReportId',
        otherKey: 'fileId',
        as: 'files',
        hooks: true,
      });
      ActivityReport.hasMany(models.NextStep, { foreignKey: 'activityReportId', as: 'specialistNextSteps', hooks: true });
      ActivityReport.hasMany(models.NextStep, { foreignKey: 'activityReportId', as: 'recipientNextSteps', hooks: true });
      ActivityReport.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.RATIFIER] },
        },
        foreignKey: 'entityId',
        as: 'approvers',
        hooks: true,
        onDelete: 'cascade',
      });
      ActivityReport.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.EDITOR] },
        },
        foreignKey: 'entityId',
        as: 'collaborators',
        hooks: true,
        onDelete: 'cascade',
      });
      ActivityReport.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.OWNER] },
        },
        foreignKey: 'entityId',
        as: 'owner',
        hooks: true,
        onDelete: 'cascade',
      });
      ActivityReport.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.INSTANTIATOR] },
        },
        foreignKey: 'entityId',
        as: 'instantiator',
        hooks: true,
        onDelete: 'cascade',
      });
      ActivityReport.hasMany(models.Approval, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
        },
        foreignKey: 'entityId',
        as: 'approvals',
        hooks: true,
      });
      ActivityReport.hasOne(models.Approval, {
        scope: {
          entityType: ENTITY_TYPES.REPORT,
          tier: 0,
        },
        foreignKey: 'entityId',
        as: 'approval',
        hooks: true,
      });
      ActivityReport.hasMany(models.ActivityReportGoal, { foreignKey: 'activityReportId', as: 'activityReportGoals', hooks: true });
      ActivityReport.belongsToMany(models.Goal, {
        through: models.ActivityReportGoal,
        foreignKey: 'activityReportId',
        otherKey: 'goalId',
        as: 'goals',
        hooks: true,
      });
      ActivityReport.hasMany(models.ActivityReportObjective, { foreignKey: 'activityReportId', as: 'activityReportObjectives', hooks: true });
      ActivityReport.belongsToMany(models.Objective, {
        scope: {
          goalId: { [Op.is]: null },
        },
        through: models.ActivityReportObjective,
        foreignKey: 'activityReportId',
        otherKey: 'objectiveId',
        as: 'objectivesWithoutGoals',
        hooks: true,
      });
      ActivityReport.belongsToMany(models.Objective, {
        scope: {
          goalId: { [Op.not]: null },
        },
        through: models.ActivityReportObjective,
        foreignKey: 'activityReportId',
        otherKey: 'objectiveId',
        as: 'objectivesWithGoals',
        hooks: true,
      });
      ActivityReport.belongsToMany(models.Objective, {
        through: models.ActivityReportObjective,
        foreignKey: 'activityReportId',
        otherKey: 'objectiveId',
        as: 'objectives',
        hooks: true,
      });
      ActivityReport.addScope('defaultScope', {
        include: [{
          model: models.Approval,
          as: 'approval',
          where: {
            submissionStatus: {
              [Op.ne]: 'deleted',
            },
          },
          required: true,
        }],
      });
    }
  }
  ActivityReport.init({
    displayId: {
      type: DataTypes.VIRTUAL(DataTypes.STRING, ['legacyId', 'regionId', 'id']),
      get() {
        const { legacyId, regionId } = this;
        if (legacyId) return legacyId.toString();
        const regionPrefix = !regionId ? '???' : `R${this.regionId.toString().padStart(2, '0')}`;
        return `${regionPrefix}-AR-${this.id}`;
      },
    },
    legacyId: {
      comment: 'Legacy identifier taken from smartsheet ReportID. Some ids adjusted to match their region.',
      type: DataTypes.STRING,
      unique: true,
    },
    // userId: {
    //   type: DataTypes.INTEGER,
    //   allowNull: true,
    // },
    lastUpdatedById: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    ECLKCResourcesUsed: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    nonECLKCResourcesUsed: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
    },
    additionalNotes: {
      type: DataTypes.TEXT,
    },
    numberOfParticipants: {
      type: DataTypes.INTEGER,
    },
    deliveryMethod: {
      type: DataTypes.STRING,
    },
    version: {
      type: DataTypes.INTEGER,
    },
    duration: {
      type: DataTypes.DECIMAL(3, 1),
    },
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    startDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    activityRecipientType: {
      type: DataTypes.STRING,
    },
    requester: {
      type: DataTypes.STRING,
    },
    targetPopulations: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    virtualDeliveryType: {
      type: DataTypes.STRING,
    },
    reason: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    participants: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    topics: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    context: {
      type: DataTypes.TEXT,
    },
    pageState: {
      type: DataTypes.JSON,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    // submissionStatus: {
    //   allowNull: false,
    //   type: DataTypes.ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
    //   validate: {
    //     checkRequiredForSubmission() {
    //       const requiredForSubmission = [
    //         this.numberOfParticipants,
    //         this.deliveryMethod,
    //         this.duration,
    //         this.endDate,
    //         this.startDate,
    //         this.activityRecipientType,
    //         this.requester,
    //         this.targetPopulations,
    //         this.reason,
    //         this.participants,
    //         this.topics,
    //         this.ttaType,
    //         this.creatorRole,
    //       ];
    //       const draftStatuses = [REPORT_STATUSES.DRAFT, REPORT_STATUSES.DELETED];
    //       if (!draftStatuses.includes(this.submissionStatus)) {
    //         // Require fields when report is not a draft
    //         if (requiredForSubmission.includes(null)) {
    //           throw new Error('Missing required field(s)');
    //         }
    //       }
    //     },
    //   },
    // },
    // calculatedStatus: {
    //   allowNull: true,
    //   type: DataTypes.ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
    // },
    ttaType: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    lastSaved: {
      type: DataTypes.VIRTUAL,
      get() {
        return moment(this.updatedAt).format('MM/DD/YYYY');
      },
    },
    // creatorNameWithRole: {
    //   type: DataTypes.VIRTUAL,
    //   get() {
    //     return this.owner.nameWithRole;
    //   },
    // },
    approvedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    imported: {
      type: DataTypes.JSONB,
      comment: 'Storage for raw values from smartsheet CSV imports',
    },
    sortedTopics: {
      type: DataTypes.VIRTUAL,
      get() {
        if (!this.topics) {
          return [];
        }
        return this.topics.sort((a, b) => {
          if (a < b) {
            return -1;
          }
          if (a > b) {
            return 1;
          }
          return 0;
        });
      },
    },
    creatorRole: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.owner) {
          return this.owner.roles;
        }
        return null;
      },
    },
    isApproved: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.approval) {
          return this.approval.calculatedStatus !== REPORT_STATUSES.APPROVED;
        }
        return null;
      },
    },
    creatorName: {
      type: DataTypes.VIRTUAL,
      get() {
        // Any report in the alerts table should show the set creator role.
        if (this.creatorRole || this.isApproved) {
          return this.creatorNameWithRole;
        }
        if (this.owner && this.owner.user) {
          return this.owner.user.fullName;
        }
        return null;
      },
    },
  }, {
    hooks: {
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ActivityReport',
  });
  return ActivityReport;
};
