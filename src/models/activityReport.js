import { Model } from 'sequelize';
import moment from 'moment';

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
      ActivityReport.hasMany(models.ActivityRecipient, { foreignKey: 'activityReportId', as: 'activityRecipients' });
      ActivityReport.hasMany(models.File, { foreignKey: 'activityReportId', as: 'activityFiles' });
    }
  }
  ActivityReport.init({
    userId: {
      type: DataTypes.INTEGER,
    },
    lastUpdatedById: {
      type: DataTypes.INTEGER,
    },
    resourcesUsed: {
      type: DataTypes.STRING,
    },
    additionalNotes: {
      type: DataTypes.STRING,
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
      allowNull: false,
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
      type: DataTypes.STRING,
    },
    pageState: {
      type: DataTypes.JSON,
    },
    status: {
      allowNull: false,
      type: DataTypes.STRING,
      validate: {
        checkRequiredForSubmission() {
          const requiredForSubmission = [
            this.deliveryMethod,
            this.duration,
            this.endDate,
            this.requestor,
            this.startDate,
            this.ttaType,
          ];
          if (this.status !== 'draft') {
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
  }, {
    sequelize,
    modelName: 'ActivityReport',
  });
  return ActivityReport;
};
