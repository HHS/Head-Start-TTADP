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
  class ReportApproval extends Model {
    static associate(models) {
      ReportApproval.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportApproval.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
    }
  }
  ReportApproval.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    submissionStatus: {
      type: DataTypes.ENUM([]),
      allowNull: false,
    },
    calculatedStatus: {
      type: DataTypes.ENUM([]),
      allowNull: false,
    },
    firstSubmittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    submittedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approvedAt: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportApproval',
    paranoid: true,
  });
  return ReportApproval;
};
