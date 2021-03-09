import { Model } from 'sequelize';
import moment from 'moment';
import { REPORT_STATUSES } from '../constants';

function formatDate(fieldName) {
  const raw = this.getDataValue(fieldName);
  if (raw) {
    return moment(raw).format('MM/DD/YYYY');
  }
  return null;
}

export default (sequelize, DataTypes) => {
  class ActivityReport extends Model {
    static associate(models) {
      ActivityReport.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      ActivityReport.belongsTo(models.User, { foreignKey: 'lastUpdatedById', as: 'lastUpdatedBy' });
      ActivityReport.belongsTo(models.User, { foreignKey: 'approvingManagerId', as: 'approvingManager' });
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
      ActivityReport.hasMany(models.NextStep, { foreignKey: 'activityReportId', as: 'granteeNextSteps' });
      ActivityReport.belongsToMany(models.Goal, {
        through: models.ActivityReportGoal,
        foreignKey: 'activityReportId',
        otherKey: 'goalId',
        as: 'goals',
      });
    }
  }
  ActivityReport.init({
    displayId: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.legacyId) return this.legacyId;
        return `R${this.regionId.toString().padStart(2, '0')}-AR-${this.id}`;
      },
    },
    legacyId: {
      comment: 'Legacy identifier taken from smartsheet ReportID. Some ids adjusted to match their region.',
      type: DataTypes.STRING,
    },
    userId: {
      type: DataTypes.INTEGER,
    },
    lastUpdatedById: {
      type: DataTypes.INTEGER,
    },
    approvingManagerId: {
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
    programTypes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
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
    managerNotes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    status: {
      allowNull: false,
      type: DataTypes.ENUM(Object.keys(REPORT_STATUSES).map((k) => REPORT_STATUSES[k])),
      validate: {
        checkRequiredForSubmission() {
          const requiredForSubmission = [
            this.approvingManagerId,
            this.resourcesUsed,
            this.numberOfParticipants,
            this.deliveryMethod,
            this.duration,
            this.endDate,
            this.startDate,
            this.activityRecipientType,
            this.requester,
            this.programTypes,
            this.targetPopulations,
            this.reason,
            this.participants,
            this.topics,
            this.ttaType,
          ];
          if (this.status !== REPORT_STATUSES.DRAFT) {
            if (requiredForSubmission.includes(null)) {
              throw new Error('Missing required field(s)');
            }
          }
        },
      },
    },
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
    imported: {
      type: DataTypes.JSONB,
      comment: 'Storage for raw values from smartsheet CSV imports',
    },
  }, {
    sequelize,
    modelName: 'ActivityReport',
  });
  return ActivityReport;
};
