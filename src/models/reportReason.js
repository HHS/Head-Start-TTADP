const {
  Model,
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
  class ReportReason extends Model {
    static associate(models) {
      ReportReason.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportReason.belongsTo(models.Reason, {
        foreignKey: 'reasonId',
        as: 'reason',
      });

      models.Report.hasMany(models.ReportReason, {
        foreignKey: 'reportId',
        as: 'reportReasons',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT },
      });
      models.Report.belongsToMany(models.Reason, {
        through: models.ReportReason,
        foreignKey: 'reportId',
        otherKey: 'reasonId',
        as: 'reasons',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT },
      });
    }
  }
  ReportReason.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reasonId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportReason',
  });
  return ReportReason;
};
