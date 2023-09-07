const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const { collectReportMatrixAssociationsForModel } = require('./helpers/reportDataMatrix');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportNextStep extends Model {
    static associate(models) {
      this.addScope('noteType', (noteType) => ({ where: { noteType } }));

      generateJunctionTableAssociations(
        this,
        [
          models.Report,
        ],
        {
          suffixes: Object.values(NEXTSTEP_NOTETYPE).map((noteType) => noteType.toLowerCase()),
          scopes: Object.values(NEXTSTEP_NOTETYPE).map((noteType) => ({ method: ['noteType', noteType] })),
        },
      );
    }
  }
  ReportNextStep.init({
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
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportNextStep',
  });
  return ReportNextStep;
};
