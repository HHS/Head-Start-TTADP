const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class MonitoringFindingHistory extends Model {
    static associate(models) {
      models.MonitoringReview.hasMany(
        models.MonitoringFindingHistory,
        {
          foreignKey: 'reviewId',
          sourceKey: 'reviewId',
          as: 'monitoringFindingHistories',
        },
      );

      models.MonitoringFindingHistory.belongsTo(
        models.MonitoringReview,
        {
          foreignKey: 'reviewId',
          sourceKey: 'reviewId',
          as: 'monitoringReview',
        },
      );
    }
  }
  MonitoringFindingHistory.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    reviewId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    findingHistoryId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    hash: {
      type: DataTypes.TEXT,
      allowNull: true,
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
    modelName: 'MonitoringFindingHistory',
    tableName: 'MonitoringFindingHistories',
    paranoid: true,
  });
  return MonitoringFindingHistory;
};
