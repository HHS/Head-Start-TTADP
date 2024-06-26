const { Model } = require('sequelize');
const { afterDestroy } = require('./hooks/activityReportObjectiveFile');

export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveFile extends Model {
    static associate(models) {
      ActivityReportObjectiveFile.belongsTo(
        models.ActivityReportObjective,
        {
          foreignKey: 'activityReportObjectiveId',
          as: 'activityReportObjective',
          onDelete: 'cascade',
        },
      );
      ActivityReportObjectiveFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
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
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveFile',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ActivityReportObjectiveFile;
};
