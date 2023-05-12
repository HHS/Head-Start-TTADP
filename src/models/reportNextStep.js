const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE, NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class ReportNextStep extends Model {
    static associate(models) {
      ReportNextStep.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });

      ReportNextStep.addScope(NEXTSTEP_NOTETYPE.RECIPIENT, {
        where: {
          noteType: NEXTSTEP_NOTETYPE.RECIPIENT,
        },
      });
      ReportNextStep.addScope(NEXTSTEP_NOTETYPE.SPECIALIST, {
        where: {
          noteType: NEXTSTEP_NOTETYPE.SPECIALIST,
        },
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .hasMany(models.ReportNextStep.scope(NEXTSTEP_NOTETYPE.RECIPIENT), {
          foreignKey: 'reportId',
          as: 'reportNextStepRecipients',
        });
      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .hasMany(models.ReportNextStep.scope(NEXTSTEP_NOTETYPE.SPECIALIST), {
          foreignKey: 'reportId',
          as: 'reportNextStepSpecialists',
        });
    }
  }
  ReportNextStep.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
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
