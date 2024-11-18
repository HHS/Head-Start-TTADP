const { Model } = require('sequelize');

/**
   * Junction table between ARO and Citations.
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveCitation extends Model {
    static associate(models) {
      ActivityReportObjectiveCitation.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      });
      ActivityReportObjectiveCitation.belongsTo(models.MonitoringStandard, { foreignKey: 'citationId', onDelete: 'cascade', as: 'citation' });
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
      type: DataTypes.STRING,
      allowNull: false,
    },
    citationId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveCitation',
  });
  return ActivityReportObjectiveCitation;
};
