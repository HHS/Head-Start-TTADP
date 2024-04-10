import { Model } from 'sequelize';
import {
  beforeCreate,
  beforeUpdate,
} from './hooks/monitoringFindingHistory';

export default (sequelize, DataTypes) => {
  class MonitoringFindingHistory extends Model {
    static associate(models) {
      models.MonitoringReviewLink.hasMany(
        models.MonitoringFindingHistory,
        {
          foreignKey: 'reviewId',
          as: 'monitoringFindingHistories',
        },
      );

      models.MonitoringFindingHistory.belongsTo(
        models.MonitoringReviewLink,
        {
          foreignKey: 'reviewId',
          as: 'monitoringReviewLink',
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
      references: {
        model: {
          tableName: 'MonitoringReviewLinks',
        },
        key: 'reviewId',
      },
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
    hooks: {
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
    },
  });
  return MonitoringFindingHistory;
};
