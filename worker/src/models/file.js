const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class File extends Model {}
  File.init({
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
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
        'APPROVED',
        'REJECTED',
      ),
      allowNull: false,
    },
    attachmentType: {
      type: DataTypes.ENUM('ATTACHMENT', 'RESOURCE'),
      allowNull: false,
    },
    // File size in bytes
    fileSize: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'File',
  });
  return File;
};
