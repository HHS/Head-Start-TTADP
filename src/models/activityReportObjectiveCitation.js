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

      // Citation (standard).
      ActivityReportObjectiveCitation.belongsTo(models.ActivityReportObjective, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjectiveCitation' });
    }
  }
  ActivityReportObjectiveCitation.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    citation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    monitoringReferences: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveCitation',
  });
  return ActivityReportObjectiveCitation;
};
