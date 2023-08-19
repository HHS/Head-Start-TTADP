const {
  Model,
  Op,
} = require('sequelize');
const {
  REPORT_TYPE,
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
      models.TargetPopulation.belongsToMany(models.Report
        .scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] }), {
        through: models.ReportTargetPopulation,
        foreignKey: 'targetPopulationId',
        otherKey: 'reportId',
        as: 'reports',
      });

      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] })
        .hasMany(models.ReportTargetPopulation, {
          foreignKey: 'reportId',
          as: 'reportTargetPopulations',
          scope: {
            validFor: REPORT_TYPE.REPORT_TRAINING_EVENT,
          },
        });
      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] })
        .belongsToMany(models.TargetPopulation, {
          through: models.ReportTargetPopulation,
          foreignKey: 'reportId',
          otherKey: 'targetPopulationId',
          as: 'targetPopulations',
          scope: {
            validFor: REPORT_TYPE.REPORT_TRAINING_EVENT,
          },
        });
    }
  }
  ReportTargetPopulation.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
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
