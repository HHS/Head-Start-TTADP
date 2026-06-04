// See docs/monitoring-fact-tables.md for column definitions and business rules.
// Read-only model for the deliveredreviews_live_values view — PostgreSQL will reject any
// write attempts at the database level. Use DeliveredReview.scope('withLiveValues') to
// include these fields via a single LEFT JOIN rather than importing this model directly.
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DeliveredReviewsLiveValues extends Model {
    static isView = true;

    static associate(models) {
      models.DeliveredReviewsLiveValues.belongsTo(models.DeliveredReview, {
        foreignKey: 'id',
        as: 'deliveredReview',
        constraints: false,
      });
    }
  }
  DeliveredReviewsLiveValues.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
      },
      last_tta: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_ar_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      last_closed_goal: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      last_closed_goal_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DeliveredReviewsLiveValues',
      tableName: 'deliveredreviews_live_values',
      timestamps: false,
      paranoid: false,
    }
  );
  return DeliveredReviewsLiveValues;
};
