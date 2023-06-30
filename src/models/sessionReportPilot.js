const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class SessionReportPilot extends Model {
    static associate(models) {
      SessionReportPilot.belongsTo(models.EventReportPilot, { foreignKey: 'eventId', as: 'event' });
      SessionReportPilot.hasMany(models.SessionReportPilotFile, { foreignKey: 'sessionReportPilotId', as: 'sessionFiles' });
      SessionReportPilot.belongsToMany(models.File, {
        through: models.SessionReportPilotFile,
        foreignKey: 'sessionReportPilotId',
        otherKey: 'fileId',
        as: 'files',
      });
    }
  }

  SessionReportPilot.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'SessionReportPilot',
  });

  return SessionReportPilot;
};
