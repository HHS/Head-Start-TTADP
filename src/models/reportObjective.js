const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportObjective extends Model {
    static associate(models) {
      ReportObjective.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportObjective.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective' });
      ReportObjective.hasMany(models.ReportObjectiveFile, { foreignKey: 'reportObjectiveId', as: 'reportObjectiveFiles' });
      ReportObjective.hasMany(models.ReportObjectiveTopic, { foreignKey: 'reportObjectiveId', as: 'reportObjectiveTopics' });
      ReportObjective.hasMany(models.ReportObjectiveResource, { foreignKey: 'reportObjectiveId', as: 'reportObjectiveResources' });
      ReportObjective.belongsToMany(models.File, {
        through: models.ReportObjectiveFile,
        foreignKey: 'reportObjectiveId',
        otherKey: 'fileId',
        as: 'files',
      });
      ReportObjective.belongsToMany(models.Topic, {
        through: models.ReportObjectiveTopic,
        foreignKey: 'reportObjectiveId',
        otherKey: 'topicId',
        as: 'topics',
      });
      ReportObjective.belongsToMany(models.Resource, {
        through: models.ReportObjectiveResource,
        foreignKey: 'reportObjectiveId',
        otherKey: 'resourceId',
        as: 'resources',
      });
    }
  }
  ReportObjective.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportId: {
      type: DataTypes.INTEGER,
    },
    objectiveId: {
      type: DataTypes.INTEGER,
    },
    ordinal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: DataTypes.TEXT,
    status: DataTypes.STRING,
    ttaProvided: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'ReportObjective',
  });
  return ReportObjective;
};
