const {
  Model,
} = require('sequelize');
const { NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportReason extends Model {
    static associate(models) {
      ReportReason.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
    }
  }
  ReportReason.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    note: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    noteType: {
      type: DataTypes.ENUM(Object.values(NEXTSTEP_NOTETYPE)),
      allowNull: false,
    },
    completedDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
  }, {
    sequelize,
    modelName: 'ReportReason',
  });
  return ReportReason;
};
