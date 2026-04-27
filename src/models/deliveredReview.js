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
    }
  }
  DeliveredReview.init({
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
    last_tta: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('last_tta');
      },
    },
    last_ar_id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('last_ar_id');
      },
    },
    last_closed_goal: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('last_closed_goal');
      },
    },
    last_closed_goal_id: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.getDataValue('last_closed_goal_id');
      },
    },
  }, {
    sequelize,
    modelName: 'DeliveredReview',
    tableName: 'DeliveredReviews',
    paranoid: true,
    // Use DeliveredReview.scope('withLiveValues').find(...) to include live-computed
    // fields (last_tta, last_ar_id, last_closed_goal, last_closed_goal_id) sourced
    // from the deliveredreviews_live_values view. These fields are null without this scope.
    scopes: {
      withLiveValues: {
        attributes: {
          include: [
            [sequelize.literal('(SELECT last_tta FROM deliveredreviews_live_values WHERE deliveredreviews_live_values.id = "DeliveredReview"."id")'), 'last_tta'],
            [sequelize.literal('(SELECT last_ar_id FROM deliveredreviews_live_values WHERE deliveredreviews_live_values.id = "DeliveredReview"."id")'), 'last_ar_id'],
            [sequelize.literal('(SELECT last_closed_goal FROM deliveredreviews_live_values WHERE deliveredreviews_live_values.id = "DeliveredReview"."id")'), 'last_closed_goal'],
            [sequelize.literal('(SELECT last_closed_goal_id FROM deliveredreviews_live_values WHERE deliveredreviews_live_values.id = "DeliveredReview"."id")'), 'last_closed_goal_id'],
          ],
        },
      },
    },
  });
  return DeliveredReview;
};
