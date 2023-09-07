const { Model } = require('sequelize');
const { afterDestroy } = require('./hooks/objectiveTemplateFile');

export default (sequelize, DataTypes) => {
  class SessionReportPilotFile extends Model {
    static associate(models) {
      SessionReportPilotFile.belongsTo(models.SessionReportPilot, { foreignKey: 'sessionReportPilotId', as: 'sessionReport' });
      SessionReportPilotFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
    }
  }
  SessionReportPilotFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    sessionReportPilotId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'SessionReportPilots' }, key: 'id' },
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'Files' }, key: 'id' },
    },
  }, {
    sequelize,
    modelName: 'SessionReportPilotFile',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return SessionReportPilotFile;
};
