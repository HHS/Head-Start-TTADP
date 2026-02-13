const { Model } = require('sequelize')
const { afterUpdate, beforeUpdate, afterCreate, beforeCreate } = require('./hooks/eventReportPilot')

export default (sequelize, DataTypes) => {
  class EventReportPilot extends Model {
    static associate(models) {
      EventReportPilot.hasMany(models.SessionReportPilot, {
        foreignKey: 'eventId',
        as: 'sessionReports',
      })
    }
  }

  EventReportPilot.init(
    {
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
      version: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'EventReportPilot',
      hooks: {
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
        afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
        beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
        beforeCreate: async (instance) => beforeCreate(sequelize, instance),
      },
    }
  )

  return EventReportPilot
}
