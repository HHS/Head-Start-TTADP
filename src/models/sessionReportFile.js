const { Model } = require('sequelize');
const { afterDestroy } = require('./hooks/sessionReportFile');

export default (sequelize, DataTypes) => {
  class SessionReportFile extends Model {
    static associate(models) {
      SessionReportFile.belongsTo(models.SessionReport, { foreignKey: 'sessionReportId', as: 'sessionReport' });
      SessionReportFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
    }
  }
  SessionReportFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    sessionReportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'SessionReportFile',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return SessionReportFile;
};
