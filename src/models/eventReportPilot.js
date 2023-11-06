const { Model } = require('sequelize');
const { afterUpdate } = require('./hooks/eventReportPilot');

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
      allowNull: false,
    },
    ownerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    pocIds: {
      type: DataTypes.ARRAY(DataTypes.INTEGER),
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
    imported: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'EventReportPilot',
    hooks: {
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });

  return EventReportPilot;
};
