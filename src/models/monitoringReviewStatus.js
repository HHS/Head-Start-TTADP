const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class MonitoringReviewStatus extends Model {
    static associate(models) {
    }
  }
  MonitoringReviewStatus.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    sourceCreatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    sourceUpdatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    sourceDeletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'MonitoringReviewStatus',
    tableName: 'MonitoringReviewStatuses',
    paranoid: true,
  });
  return MonitoringReviewStatus;
};
