const {
  Model,
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
  class ReportImport extends Model {
    static associate(models) {
      // TODO: Use matrix
      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] })
        .hasMany(models.ReportReason, {
          foreignKey: 'reportId',
          as: 'reportReasons',
        });
      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] })
        .belongsToMany(models.Reason, {
          through: models.ReportReason,
          foreignKey: 'reportId',
          otherKey: 'reasonId',
          as: 'reasons',
        });
    }
  }
  ReportImport.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportImport',
  });
  return ReportImport;
};
