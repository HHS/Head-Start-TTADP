const {
  Model,
} = require('sequelize');
const {
  REPORT_TYPE,
} = require('../constants');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportImport extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportImport,
        [
          models.Report,
        ],
      );

      // TODO: Use matrix
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
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
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
