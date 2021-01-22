import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ActivityReportCollaborator extends Model {
    static associate(models) {
      ActivityReportCollaborator.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportCollaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
    }
  }
  ActivityReportCollaborator.init({
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    userId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportCollaborator',
  });
  return ActivityReportCollaborator;
};
