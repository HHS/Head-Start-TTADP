const { Model } = require('sequelize');
const { getPresignedURL } = require('../lib/s3');

export default (sequelize, DataTypes) => {
  class File extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      File.hasMany(models.ActivityReportFile, { foreignKey: 'fileId', as: 'reportFiles', hooks: true });
      File.hasMany(models.ActivityReportObjectiveFile, { foreignKey: 'fileId', as: 'reportObjectiveFiles', hooks: true });
      File.hasMany(models.ObjectiveFile, { foreignKey: 'fileId', as: 'objectiveFiles', hooks: true });
      File.hasMany(models.ObjectiveTemplateFile, { foreignKey: 'fileId', as: 'objectiveTemplateFiles', hooks: true });

      File.belongsToMany(models.ActivityReport, {
        through: models.ActivityReportFile,
        foreignKey: 'fileId',
        otherKey: 'activityReportId',
        as: 'reports',
        hooks: true,
      });
      File.belongsToMany(models.ActivityReportObjective, {
        through: models.ActivityReportObjectiveFile,
        foreignKey: 'fileId',
        otherKey: 'activityReportObjectiveId',
        as: 'reportObjectives',
        hooks: true,
      });
      File.belongsToMany(models.Objective, {
        through: models.ObjectiveFile,
        foreignKey: 'fileId',
        otherKey: 'objectiveId',
        as: 'objectives',
        hooks: true,
      });
      File.belongsToMany(models.ObjectiveTemplate, {
        through: models.ObjectiveTemplateFile,
        foreignKey: 'fileId',
        otherKey: 'objectiveTemplateId',
        as: 'objectiveTemplates',
        hooks: true,
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
  });
  return File;
};
