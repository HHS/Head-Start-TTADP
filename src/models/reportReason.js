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
  ReportReason.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    reasonId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reasons',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ReportReason',
  });
  return ReportReason;
};
