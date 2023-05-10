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
  class ReportReason extends Model {
    static associate(models) {
      ReportReason.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportReason.belongsTo(models.Reason, { foreignKey: 'reasonId', as: 'reason' });
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
