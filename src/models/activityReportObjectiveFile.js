const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveFile extends Model {
    static associate(models) {
      ActivityReportObjectiveFile.belongsTo(
        models.ActivityReportObjective,
        {
          foreignKey: 'activityReportObjectiveId',
          as: 'activityReportObjective',
          onDelete: 'cascade',
          hooks: true,
        },
      );
      ActivityReportObjectiveFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file', hooks: true });
    }
  }
  ActivityReportObjectiveFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportObjectiveId: {
      type: DataTypes.INTEGER,
    },
    fileId: {
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveFile',
  });
  return ActivityReportObjectiveFile;
};
