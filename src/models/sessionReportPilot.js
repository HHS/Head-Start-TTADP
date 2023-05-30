const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class SessionReportPilot extends Model {
    static associate(models) {
      SessionReportPilot.belongsTo(models.EventReportPilot, { foreignKey: 'eventId', as: 'event' });
    }
  }

  SessionReportPilot.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
