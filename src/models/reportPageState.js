const {
  Model,
} = require('sequelize');
const { collectReportMatrixAssociationsForModel } = require('./helpers/reportDataMatrix');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportPageState extends Model {
    static associate(models) {
      // Reports
      collectReportMatrixAssociationsForModel(models, this.modelName)
        .forEach(({
          model,
          prefix,
          associations,
        }) => {
          associations.forEach((config) => {
            model.hasOne(this, {
              foreignKey: 'reportId',
              as: `reportPageState${config.as}`,
            });
            this.belongsTo(model, {
              foreignKey: 'reportId',
              as: `${prefix}`,
            });
          });
        });
    }
  }
  ReportPageState.init({
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
    pageState: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportPageState',
  });
  return ReportPageState;
};
