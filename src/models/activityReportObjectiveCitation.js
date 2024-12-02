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
      // ARO Citations.
      models.ActivityReportObjective.hasMany(models.ActivityReportObjectiveCitation, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjectiveCitations',
      });
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
