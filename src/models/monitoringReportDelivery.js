import { Model } from 'sequelize';

/**
 * One row per recipient/monitoring report combination the Hub detected as newly delivered.
 * `createdAt` is when the Hub detected the delivery. See
 * src/services/monitoringDeliveryNotifications.ts.
 */
export default (sequelize, DataTypes) => {
  class MonitoringReportDelivery extends Model {
    static associate(models) {
      MonitoringReportDelivery.belongsTo(models.DeliveredReview, {
        foreignKey: 'deliveredReviewId',
        as: 'deliveredReview',
      });
      MonitoringReportDelivery.belongsTo(models.Recipient, {
        foreignKey: 'recipientId',
        as: 'recipient',
      });
      MonitoringReportDelivery.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });
    }
  }
  MonitoringReportDelivery.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      deliveredReviewId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      recipientId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      regionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'MonitoringReportDelivery',
      tableName: 'MonitoringReportDeliveries',
    }
  );
  return MonitoringReportDelivery;
};
