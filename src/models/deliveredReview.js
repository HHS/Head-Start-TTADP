// See docs/monitoring-fact-tables.md for column definitions and business rules.
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class DeliveredReview extends Model {
    static associate(models) {
      models.DeliveredReview.hasMany(models.DeliveredReviewCitation, {
        foreignKey: 'deliveredReviewId',
        as: 'deliveredReviewCitations',
      });
      models.DeliveredReview.hasMany(models.GrantDeliveredReview, {
        foreignKey: 'deliveredReviewId',
        as: 'grantDeliveredReviews',
      });
      models.DeliveredReview.belongsToMany(models.Citation, {
        through: models.DeliveredReviewCitation,
        foreignKey: 'deliveredReviewId',
        otherKey: 'citationId',
        as: 'citations',
      });
      models.DeliveredReview.belongsToMany(models.Grant, {
        through: models.GrantDeliveredReview,
        foreignKey: 'deliveredReviewId',
        otherKey: 'grantId',
        as: 'grants',
      });
      models.DeliveredReview.hasOne(models.DeliveredReviewsLiveValues, {
        foreignKey: 'id',
        as: 'liveValues',
        constraints: false,
      });
    }
  }
  DeliveredReview.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      mrid: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
      },
      review_uuid: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      review_type: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      review_status: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      review_name: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      report_delivery_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      report_start_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      report_end_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      outcome: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      complete_date: {
        type: DataTypes.DATEONLY,
        allowNull: true,
      },
      complete: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
      corrected: {
        type: DataTypes.BOOLEAN,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'DeliveredReview',
      tableName: 'DeliveredReviews',
      paranoid: true,
      // Use DeliveredReview.scope('withLiveValues').find(...) to LEFT JOIN
      // deliveredreviews_live_values and include last_tta, last_ar_id, last_closed_goal,
      // and last_closed_goal_id. Results are available as deliveredReview.liveValues.<field>.
      scopes: {
        withLiveValues: {
          include: [{ association: 'liveValues', required: false }],
        },
      },
    }
  );
  return DeliveredReview;
};
