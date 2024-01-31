const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class MonitoringClassSummary extends Model {
    static associate(models) {
      models.MonitoringReview.hasMany(
        models.MonitoringClassSummary,
        {
          foreignKey: 'reviewId',
          targetKey: 'reviewId',
          as: 'monitoringClassSummaries',
        },
      );

      models.MonitoringClassSummary.belongsTo(
        models.MonitoringReview,
        {
          foreignKey: 'reviewId',
          targetKey: 'reviewId',
          as: 'monitoringReview',
        },
      );

      models.Grant.hasMany(
        models.MonitoringClassSummary,
        {
          foreignKey: 'grantNumber',
          targetKey: 'number',
          as: 'monitoringClassSummaries',
        },
      );

      models.MonitoringClassSummary.belongsTo(
        models.Grant,
        {
          foreignKey: 'number',
          targetKey: 'grantNumber',
          as: 'grant',
        },
      );
    }
  }
  MonitoringClassSummary.init({
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
    grantNumber: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    emotionalSupport: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
    },
    classroomOrganization: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
    },
    instructionalSupport: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
    },
    reportDeliveryDate: {
      type: DataTypes.DATE,
      allowNull: true,
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
    modelName: 'MonitoringClassSummary',
    tableName: 'MonitoringClassSummaries',
    paranoid: true,
  });
  return MonitoringClassSummary;
};
