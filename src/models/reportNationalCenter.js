const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, NATIONAL_CENTER_ACTING_AS } = require('../constants');
const { generateJunctionTableAssociations } = require('./helpers/associations');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportNationalCenter extends Model {
    static associate(models) {
      ReportNationalCenter.addScope(NATIONAL_CENTER_ACTING_AS.TRAINER, {
        where: {
          actingAs: NATIONAL_CENTER_ACTING_AS.TRAINER,
        },
      });

      // TODO: needs to support matrix
      generateJunctionTableAssociations(
        models.ReportNationalCenter, // TODO: needs to support .scope(NATIONAL_CENTER_ACTING_AS.TRAINER)
        [
          models.Report, // TODO: to support with & without .scope({ method: ['reportType', REPORT_TYPE.REPORT_SESSION] })
          models.NationalCenter,
        ],
      );
    }
  }
  ReportNationalCenter.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
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
