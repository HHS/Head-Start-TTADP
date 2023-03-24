const { Op, Model } = require('sequelize');
const moment = require('moment');
const { REPORT_STATUSES, USER_ROLES, NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const {
  beforeCreate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
  beforeValidate,
} = require('./hooks/activityReport');

const generateCreatorNameWithRole = (ar) => {
  const creatorName = ar.author ? ar.author.name : '';
  let roles = '';
  if (ar.creatorRole) {
    roles = ar.creatorRole === 'TTAC' || ar.creatorRole === 'COR' ? `, ${ar.creatorRole}` : `, ${ar.creatorRole.split(' ').map((word) => word[0]).join('')}`;
  }
  return `${creatorName}${roles}`;
};

export default (sequelize, DataTypes) => {
  class ActivityReport extends Model {
    static associate(models) {
      ActivityReport.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      ActivityReport.belongsTo(models.User, { foreignKey: 'lastUpdatedById', as: 'lastUpdatedBy' });
      ActivityReport.hasMany(models.ActivityRecipient, { foreignKey: 'activityReportId', as: 'activityRecipients' });
      ActivityReport.hasMany(models.ActivityReportCollaborator, { foreignKey: 'activityReportId', as: 'activityReportCollaborators' });
      ActivityReport.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
      ActivityReport.hasMany(models.ActivityReportFile, { foreignKey: 'activityReportId', as: 'reportFiles' });
      ActivityReport.belongsToMany(models.File, {
        through: models.ActivityReportFile,
        foreignKey: 'activityReportId',
        otherKey: 'fileId',
        as: 'files',
      });
      ActivityReport.hasMany(models.ActivityReportResource, { foreignKey: 'activityReportId', as: 'activityReportResources' });
      ActivityReport.belongsToMany(models.Resource, {
        through: models.ActivityReportResource,
        foreignKey: 'activityReportId',
        otherKey: 'resourceId',
        as: 'resources',
      });
      ActivityReport.hasMany(models.NextStep, {
        foreignKey: 'activityReportId',
        as: 'specialistNextSteps',
        scope: { noteType: [NEXTSTEP_NOTETYPE.SPECIALIST] },
      });
      ActivityReport.hasMany(models.NextStep, {
        foreignKey: 'activityReportId',
        as: 'recipientNextSteps',
        scope: { noteType: [NEXTSTEP_NOTETYPE.RECIPIENT] },
      });
      ActivityReport.hasMany(models.ActivityReportApprover, { foreignKey: 'activityReportId', as: 'approvers', hooks: true });
      ActivityReport.hasMany(models.ActivityReportGoal, { foreignKey: 'activityReportId', as: 'activityReportGoals' });
      ActivityReport.belongsToMany(models.Goal, {
        through: models.ActivityReportGoal,
        foreignKey: 'activityReportId',
        otherKey: 'goalId',
        as: 'goals',
      });
      ActivityReport.hasMany(models.ActivityReportObjective, { foreignKey: 'activityReportId', as: 'activityReportObjectives' });
      ActivityReport.belongsToMany(models.Objective, {
        scope: {
          goalId: { [Op.is]: null },
        },
        through: models.ActivityReportObjective,
        foreignKey: 'activityReportId',
        otherKey: 'objectiveId',
        as: 'objectivesWithoutGoals',
      });
      ActivityReport.belongsToMany(models.Objective, {
        scope: {
          goalId: { [Op.not]: null },
        },
        through: models.ActivityReportObjective,
        foreignKey: 'activityReportId',
        otherKey: 'objectiveId',
        as: 'objectivesWithGoals',
      });
      ActivityReport.belongsToMany(models.Objective, {
        through: models.ActivityReportObjective,
        foreignKey: 'activityReportId',
        otherKey: 'objectiveId',
        as: 'objectives',
      });
      ActivityReport.addScope('defaultScope', {
        where: {
          submissionStatus: {
            [Op.ne]: 'deleted',
          },
        },
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
    userId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
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
    submissionStatus: {
      allowNull: false,
      type: DataTypes.ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
      validate: {
        checkRequiredForSubmission() {
          const requiredForSubmission = [
            this.numberOfParticipants,
            this.deliveryMethod,
            this.duration,
            this.endDate,
            this.startDate,
            this.activityRecipientType,
            this.requester,
            this.targetPopulations,
            this.reason,
            this.participants,
            this.topics,
            this.ttaType,
            this.creatorRole,
          ];
          const draftStatuses = [REPORT_STATUSES.DRAFT, REPORT_STATUSES.DELETED];
          if (!draftStatuses.includes(this.submissionStatus)) {
            // Require fields when report is not a draft
            if (requiredForSubmission.includes(null)) {
              throw new Error('Missing required field(s)');
            }
          }
        },
      },
    },
    calculatedStatus: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
    },
    ttaType: {
      type: DataTypes.ARRAY(DataTypes.STRING),
    },
    submittedDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
      allowNull: true,
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
    creatorNameWithRole: {
      type: DataTypes.VIRTUAL,
      get() {
        return generateCreatorNameWithRole(this);
      },
    },
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
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(USER_ROLES).map((k) => USER_ROLES[k])),
    },
    creatorName: {
      type: DataTypes.VIRTUAL,
      get() {
        // Any report in the alerts table should show the set creator role.
        if (this.creatorRole || this.calculatedStatus !== REPORT_STATUSES.APPROVED) {
          return this.creatorNameWithRole;
        }
        if (this.author) {
          return this.author.fullName;
        }
        return null;
      },
    },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeCreate: async (instance) => beforeCreate(instance),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ActivityReport',
  });
  return ActivityReport;
};
