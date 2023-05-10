const {
  Model,
} = require('sequelize');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportTargetPopulation extends Model {
    static associate(models) {
      ReportTargetPopulation.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportTargetPopulation.belongsTo(models.TargetPopulation, { foreignKey: 'targetPopulationId', as: 'targetPopulation' });
    }
  }
  ReportTargetPopulation.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    targetPopulationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportTargetPopulation',
  });
  return ReportTargetPopulation;
};
