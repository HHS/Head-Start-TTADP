const {
  Model,
} = require('sequelize');
const { NATIONAL_CENTER_ACTING_AS } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportNationalCenter extends Model {
    static associate(models) {
      ReportNationalCenter.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportNationalCenter.belongsTo(models.NationalCenter, { foreignKey: 'nationalCenterId', as: 'nationalCenter' });
    }
  }
  ReportNationalCenter.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    nationalCenterId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    actingAs: {
      type: DataTypes.ENUM(Object.values(NATIONAL_CENTER_ACTING_AS)),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportNationalCenter',
  });
  return ReportNationalCenter;
};
