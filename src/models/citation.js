// See docs/monitoring-fact-tables.md for column definitions and business rules.
import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class Citation extends Model {
    static associate(models) {
      models.Citation.hasMany(models.DeliveredReviewCitation, {
        foreignKey: 'citationId',
        as: 'deliveredReviewCitations',
      });
      models.Citation.hasMany(models.GrantCitation, {
        foreignKey: 'citationId',
        as: 'grantCitations',
      });
      models.Citation.hasMany(models.ActivityReportObjectiveCitation, {
        foreignKey: 'citationId',
        as: 'activityReportObjectiveCitations',
      });
      models.Citation.belongsToMany(models.DeliveredReview, {
        through: models.DeliveredReviewCitation,
        foreignKey: 'citationId',
        otherKey: 'deliveredReviewId',
        as: 'deliveredReviews',
      });
      models.Citation.belongsToMany(models.Grant, {
        through: models.GrantCitation,
        foreignKey: 'citationId',
        otherKey: 'grantId',
        as: 'grants',
      });
      models.Citation.belongsToMany(models.ActivityReportObjective, {
        through: models.ActivityReportObjectiveCitation,
        foreignKey: 'citationId',
        otherKey: 'activityReportObjectiveId',
        as: 'activityReportObjectives',
      });
      models.Citation.hasMany(models.Standard, {
        foreignKey: 'citationId',
        as: 'standards',
      });
    }
  }
  Citation.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    mfid: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    finding_uuid: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    raw_status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    calculated_status: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    active: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    last_review_delivered: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    raw_finding_type: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    calculated_finding_type: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    source_category: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    finding_deadline: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    reported_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    closed_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    citation: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    standard_text: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    initial_review_uuid: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    initial_narrative: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    initial_determination: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    initial_report_delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    latest_review_uuid: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latest_narrative: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latest_determination: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    latest_report_delivery_date: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
    latest_goal_closure: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    active_through: {
      type: DataTypes.DATEONLY,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Citation',
    tableName: 'Citations',
    paranoid: true,
  });
  return Citation;
};
