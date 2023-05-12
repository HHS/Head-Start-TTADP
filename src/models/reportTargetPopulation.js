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

      models.Report.hasMany(models.ReportTargetPopulation, {
        foreignKey: 'reportId',
        as: 'reportTargetPopulations',
        scope: {
          [Op.and]: {
            validFor: sequelize.col('"Report".reportType'),
            [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT,
          },
        },
      });
      models.Report.belongsToMany(models.TargetPopulation, {
        through: models.ReportTargetPopulation,
        foreignKey: 'reportId',
        otherKey: 'targetPopulationId',
        as: 'targetPopulations',
        scope: {
          [Op.and]: {
            validFor: sequelize.col('"Report".reportType'),
            [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT,
          },
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
