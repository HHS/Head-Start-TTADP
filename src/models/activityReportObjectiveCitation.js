const { Model } = require('sequelize');

/**
   * Junction table between ARO and Citations.
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveCitation extends Model {
    static associate(models) {
      // ARO.
      ActivityReportObjectiveCitation.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      });

      // Note: We join these to the 'link' tables,
      // that inturn join to the monitoring tables via a GUID.
      // Review.
      ActivityReportObjectiveCitation.belongsTo(models.MonitoringReviewLink, { foreignKey: 'reviewId', as: 'review' });

      /*
      ActivityReportObjectiveCitation.belongsToMany(models.MonitoringReview, {
        through: models.MonitoringReviewLink,
        foreignKey: 'reviewId',
        otherKey: 'reviewId',
        as: 'reviews',
      });
      */

      // Finding.
      ActivityReportObjectiveCitation.belongsTo(models.MonitoringFindingLink, { foreignKey: 'findingId', as: 'finding' });

      /*
      ActivityReportObjectiveCitation.belongsToMany(models.MonitoringFinding, {
        through: models.MonitoringFindingLink,
        foreignKey: 'findingId',
        otherKey: 'findingId',
        as: 'findings',
      });
      */

      // Citation (standard).
      ActivityReportObjectiveCitation.belongsTo(models.MonitoringStandardLink, { foreignKey: 'citationId', as: 'citation' });
      /*
      ActivityReportObjectiveCitation.belongsToMany(models.MonitoringStandard, {
        through: models.MonitoringStandardLink,
        foreignKey: 'standardId',
        otherKey: 'standardId',
        as: 'citations',
      });
      */
    }
  }
  ActivityReportObjectiveCitation.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportObjectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reviewId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    findingId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    citationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveCitation',
  });
  return ActivityReportObjectiveCitation;
};
