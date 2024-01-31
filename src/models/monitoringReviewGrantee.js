import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class MonitoringReviewGrantee extends Model {
    static associate(models) {
      models.MonitoringReview.hasMany(
        models.MonitoringReviewGrantee,
        {
          foreignKey: 'reviewId',
          targetKey: 'reviewId',
          as: 'monitoringReviewGrantees',
        },
      );

      models.MonitoringReviewGrantee.belongsTo(
        models.MonitoringReview,
        {
          foreignKey: 'reviewId',
          targetKey: 'reviewId',
          as: 'monitoringReview',
        },
      );

      models.Grant.hasMany(
        models.MonitoringReviewGrantee,
        {
          foreignKey: 'grantNumber',
          targetKey: 'number',
          as: 'monitoringReviewGrantees',
        },
      );

      models.MonitoringReviewGrantee.belongsTo(
        models.Grant,
        {
          foreignKey: 'number',
          targetKey: 'grantNumber',
          as: 'grant',
        },
      );
    }
  }
  MonitoringReviewGrantee.init({
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
    granteeId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    createTime: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updateTime: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    updateBy: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    grantNumber: {
      allowNull: false,
      type: DataTypes.TEXT,
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
    modelName: 'MonitoringReviewGrantee',
    tableName: 'MonitoringReviewGrantees',
    paranoid: true,
  });
  return MonitoringReviewGrantee;
};
