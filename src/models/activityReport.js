const { Op, Model } = require('sequelize');
const moment = require('moment');
const { isEqual, uniqWith } = require('lodash');
const { REPORT_STATUSES } = require('../constants');

function formatDate(fieldName) {
  const raw = this.getDataValue(fieldName);
  if (raw) {
    return moment(raw).format('MM/DD/YYYY');
  }
  return null;
}

/**
 * Helper function called by model hooks.
 * Updates current model instance's calculatedStatus field.
 * Background: calculatedStatus is updated to 'submitted', 'needs_review', and 'approved'
 * based on hooks on the ActivityReportApprovers. Before submission though,
 * we want calculatedStatus to function like submissionStatus so developers
 * only have to check calculatedStatus to determine overall report status.
 * @param {*} report - current model instance
 */
function copyStatus(report) {
  const { submissionStatus } = report;
  if (submissionStatus === REPORT_STATUSES.DRAFT
    || submissionStatus === REPORT_STATUSES.DELETED) {
    // eslint-disable-next-line no-param-reassign
    report.calculatedStatus = submissionStatus;
  }
}

module.exports = (sequelize, DataTypes) => {
  class ActivityReport extends Model {
    static associate(models) {
      ActivityReport.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      ActivityReport.belongsTo(models.User, { foreignKey: 'lastUpdatedById', as: 'lastUpdatedBy' });
      ActivityReport.belongsTo(models.User, { foreignKey: 'oldApprovingManagerId', as: 'oldApprovingManager' });
      ActivityReport.hasMany(models.ActivityRecipient, { foreignKey: 'activityReportId', as: 'activityRecipients' });
      ActivityReport.belongsToMany(models.User, {
        through: models.ActivityReportCollaborator,
        // The key in the join table that points to the model defined in this file
        foreignKey: 'activityReportId',
        // The key in the join table that points to the "target" of the belongs to many (Users in
        // this case)
        otherKey: 'userId',
        as: 'collaborators',
      });
      ActivityReport.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
      ActivityReport.hasMany(models.File, { foreignKey: 'activityReportId', as: 'attachments' });
      ActivityReport.hasMany(models.NextStep, { foreignKey: 'activityReportId', as: 'specialistNextSteps' });
      ActivityReport.hasMany(models.NextStep, { foreignKey: 'activityReportId', as: 'recipientNextSteps' });
      ActivityReport.hasMany(models.ActivityReportApprover, { foreignKey: 'activityReportId', as: 'approvers', hooks: true });
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
    oldApprovingManagerId: {
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
    oldManagerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    goals: {
      type: DataTypes.VIRTUAL,
      get() {
        const objectives = this.objectivesWithGoals || [];
        const goalsArray = objectives.map((o) => o.goal);
        const goals = uniqWith(goalsArray, isEqual);

        return goals.map((goal) => {
          const objs = objectives.filter((o) => o.goalId === goal.id);
          const plainObjectives = objs.map((o) => {
            const plain = o.get({ plain: true });
            const { goal: _, ...plainObj } = plain;
            return plainObj;
          });
          const ret = {
            ...goal.get({ plain: true }),
            objectives: plainObjectives,
          };
          return ret;
        });
      },
    },
    lastSaved: {
      type: DataTypes.VIRTUAL,
      get() {
        return moment(this.updatedAt).format('MM/DD/YYYY');
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
  }, {
    sequelize,
    modelName: 'ActivityReport',
    hooks: {
      beforeCreate: (report) => {
        copyStatus(report);
      },
      beforeUpdate: (report) => {
        copyStatus(report);
      },
    },
  });
  return ActivityReport;
};
