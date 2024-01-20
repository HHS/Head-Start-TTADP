const { Model } = require('sequelize');

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
          foreignKey: 'number',
          targetKey: 'grantNumber',
          as: 'monitoringReviewGrantees',
        },
      );

      models.MonitoringReviewGrantee.belongsTo(
        models.Grant,
        {
          foreignKey: 'grantNumber',
          targetKey: 'number',
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
      allowNull: true,
    },
    granteeId: {
      type: DataTypes.TEXT,
      allowNull: true,
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
      type: DataTypes.DATE,
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
