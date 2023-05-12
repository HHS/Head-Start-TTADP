const {
  Model,
} = require('sequelize');
const { REPORT_STATUSES } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportApproval extends Model {
    static associate(models) {
      ReportApproval.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportApproval.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });

      models.Report.hasOne(models.ReportApproval, { // TODO: limit scope by report type
        foreignKey: 'reportId',
        as: 'reportApproval',
      });
    }
  }
  ReportApproval.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    submissionStatus: {
      type: DataTypes.ENUM(Object.values(REPORT_STATUSES)),
      allowNull: false,
    },
    calculatedStatus: {
      type: DataTypes.ENUM(Object.values(REPORT_STATUSES)),
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
