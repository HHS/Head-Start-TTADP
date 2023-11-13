const { Model } = require('sequelize');
const { getPresignedURL } = require('../lib/s3');
const { afterDestroy } = require('./hooks/file');

export default (sequelize, DataTypes) => {
  class File extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      File.hasMany(models.ActivityReportFile, { foreignKey: 'fileId', as: 'reportFiles' });
      File.hasMany(models.ActivityReportObjectiveFile, { foreignKey: 'fileId', as: 'reportObjectiveFiles' });
      File.hasMany(models.ObjectiveFile, { foreignKey: 'fileId', as: 'objectiveFiles' });
      File.hasMany(models.ObjectiveTemplateFile, { foreignKey: 'fileId', as: 'objectiveTemplateFiles' });
      File.hasMany(models.SessionReportPilotFile, { foreignKey: 'fileId', as: 'sessionFiles' });

      File.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportFile,
        foreignKey: 'fileId',
        otherKey: 'activityReportId',
        as: 'reports',
      });
      File.belongsToMany(models.ActivityReportObjective, {
        through: models.ActivityReportObjectiveFile,
        foreignKey: 'fileId',
        otherKey: 'activityReportObjectiveId',
        as: 'reportObjectives',
      });
      File.belongsToMany(models.Objective, {
        through: models.ObjectiveFile,
        foreignKey: 'fileId',
        otherKey: 'objectiveId',
        as: 'objectives',
      });
      File.belongsToMany(models.ObjectiveTemplate, {
        through: models.ObjectiveTemplateFile,
        foreignKey: 'fileId',
        otherKey: 'objectiveTemplateId',
        as: 'objectiveTemplates',
      });
      File.belongsToMany(models.SessionReportPilot, {
        through: models.SessionReportPilotFile,
        foreignKey: 'fileId',
        otherKey: 'sessionReportPilotId',
        as: 'sessions',
      });
      File.belongsToMany(models.CommunicationLog, {
        through: models.CommunicationLogFile,
        foreignKey: 'fileId',
        otherKey: 'communicationLogId',
        as: 'logs',
      });
    }
  }
  File.init({
    originalFileName: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    key: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(
        'UPLOADING',
        'UPLOADED',
        'UPLOAD_FAILED',
        'QUEUEING_FAILED',
        'SCANNING_QUEUED',
        'SCANNING',
        'SCANNING_FAILED',
        'APPROVED',
        'REJECTED',
      ),
      allowNull: false,
    },
    // File size in bytes
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    url: {
      type: DataTypes.VIRTUAL,
      get() {
        const url = getPresignedURL(this.key);
        return url;
      },
    },
  }, {
    sequelize,
    modelName: 'File',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return File;
};
