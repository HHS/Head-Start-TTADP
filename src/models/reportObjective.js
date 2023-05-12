const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportObjective extends Model {
    static associate(models) {
      ReportObjective.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportObjective.belongsTo(models.Objective, {
        foreignKey: 'objectiveId',
        as: 'objective',
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .hasMany(models.ReportObjective, {
          foreignKey: 'reportId',
          as: 'reportObjectives',
        });
    }
  }
  ReportObjective.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportId: {
      type: DataTypes.INTEGER,
    },
    objectiveId: {
      type: DataTypes.INTEGER,
    },
    ordinal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: DataTypes.TEXT,
    status: DataTypes.STRING,
    ttaProvided: DataTypes.TEXT,
  }, {
    sequelize,
    modelName: 'ReportObjective',
  });
  return ReportObjective;
};
