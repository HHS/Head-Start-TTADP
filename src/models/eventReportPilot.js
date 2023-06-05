const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class EventReportPilot extends Model {
    static associate(models) {
      EventReportPilot.hasMany(models.SessionReportPilot, { foreignKey: 'eventId', as: 'sessionReports' });
    }
  }

  EventReportPilot.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pocId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    collaboratorIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
      allowNull: false,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'EventReportPilot',
  });

  return EventReportPilot;
};
