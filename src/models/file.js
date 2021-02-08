import { Model } from 'sequelize';
import { getPresignedURL, getPresignedUrl } from '../lib/s3Uploader';

module.exports = (sequelize, DataTypes) => {
  class File extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      File.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId' });
    }
  }
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
      type: DataTypes.ENUM('UPLOADING', 'UPLOADED', 'UPLOAD_FAILED', 'SCANNING', 'APPROVED', 'REJECTED'),
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
    url: {
      type: DataTypes.VIRTUAL,
      async get() {
        return getPresignedURL(this.key);
      },
    },
  }, {
    sequelize,
    modelName: 'File',
  });
  return File;
};
