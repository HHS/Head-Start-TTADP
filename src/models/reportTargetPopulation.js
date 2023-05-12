const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
} = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportTargetPopulation extends Model {
    static associate(models) {
      ReportTargetPopulation.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportTargetPopulation.belongsTo(models.TargetPopulation, {
        foreignKey: 'targetPopulationId',
        as: 'targetPopulation',
      });

      models.TargetPopulation.hasMany(models.ReportTargetPopulation, {
        foreignKey: 'targetPopulationId',
        as: 'reportTargetPopulations',
      });
      models.TargetPopulation.belongsToMany(models.Report.scope(ENTITY_TYPE.REPORT_EVENT), {
        through: models.ReportTargetPopulation,
        foreignKey: 'targetPopulationId',
        otherKey: 'reportId',
        as: 'reports',
      });

      models.Report.scope(ENTITY_TYPE.REPORT_EVENT)
        .hasMany(models.ReportTargetPopulation, {
          foreignKey: 'reportId',
          as: 'reportTargetPopulations',
          scope: {
            validFor: ENTITY_TYPE.REPORT_EVENT,
          },
        });
      models.Report.scope(ENTITY_TYPE.REPORT_EVENT)
        .belongsToMany(models.TargetPopulation, {
          through: models.ReportTargetPopulation,
          foreignKey: 'reportId',
          otherKey: 'targetPopulationId',
          as: 'targetPopulations',
          scope: {
            validFor: ENTITY_TYPE.REPORT_EVENT,
          },
        });
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
