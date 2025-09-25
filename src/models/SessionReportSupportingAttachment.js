const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class SessionReportSupportingAttachment extends Model {
    static associate(models) {
      SessionReportSupportingAttachment.belongsTo(models.SessionReport, { foreignKey: 'sessionReportId', as: 'sessionReport' });
      SessionReportSupportingAttachment.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
    }
  }
  SessionReportSupportingAttachment.init({
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
    modelName: 'SessionReportSupportingAttachment',
  });
  return SessionReportSupportingAttachment;
};
