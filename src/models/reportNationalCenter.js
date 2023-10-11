const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, NATIONAL_CENTER_ACTING_AS } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

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

      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportNationalCenter.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
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
    nationalCenterId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'NationalCenters',
        },
        key: 'id',
      },
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
