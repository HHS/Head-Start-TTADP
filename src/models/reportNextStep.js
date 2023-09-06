const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const { collectReportMatrixAssociationsForModel } = require('./helpers/reportDataMatrix');

export default (sequelize, DataTypes) => {
  class ReportNextStep extends Model {
    static associate(models) {
      this.addScope('noteType', (noteType) => ({ where: { noteType } }));

      // Reports
      collectReportMatrixAssociationsForModel(models, this.modelName)
        .forEach(({
          model,
          prefix,
          associations,
        }) => {
          associations.forEach((config) => {
            const localModel = config.method
              ? this.scope({ method: config.method })
              : this;

            model.hasMany(localModel, {
              foreignKey: 'reportId',
              as: `reportNextStep${config.as}`,
            });
            localModel.belongsTo(model, {
              foreignKey: 'reportId',
              as: `${prefix}`,
            });
          });
        });
    }
  }
  ReportNextStep.init({
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
    modelName: 'ReportNextStep',
  });
  return ReportNextStep;
};
