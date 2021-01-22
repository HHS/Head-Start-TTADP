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
    }
  }
  ActivityReport.init({
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
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      allowNull: false,
      type: DataTypes.STRING,
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
