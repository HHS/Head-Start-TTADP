const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE, NATIONAL_CENTER_ACTING_AS } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportNationalCenter extends Model {
    static associate(models) {
      ReportNationalCenter.belongsTo(models.Report.scope(ENTITY_TYPE.REPORT_SESSION), {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportNationalCenter.belongsTo(models.NationalCenter, {
        foreignKey: 'nationalCenterId',
        as: 'nationalCenter',
      });
      ReportNationalCenter.addScope(NATIONAL_CENTER_ACTING_AS.TRAINER, {
        where: {
          actingAs: NATIONAL_CENTER_ACTING_AS.TRAINER,
        },
      });

      // Relocated from report.js as the scopes needed to be defined before the associations.
      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .hasMany(models.ReportNationalCenter.scope(NATIONAL_CENTER_ACTING_AS.TRAINER), {
          foreignKey: 'reportId',
          as: 'reportTrainers',
        });
      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .belongsToMany(models.NationalCenter, {
          through: models.ReportNationalCenter.scope(NATIONAL_CENTER_ACTING_AS.TRAINER),
          foreignKey: 'reportId',
          otherKey: 'nationalCenterId',
          as: 'trainers',
        });
    }
  }
  ReportNationalCenter.init({
    id: {
      type: DataTypes.BIGINT,
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
