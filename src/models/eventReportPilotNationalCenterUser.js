const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class EventReportPilotNationalCenterUser extends Model {
    static associate(models) {
      EventReportPilotNationalCenterUser.belongsTo(models.NationalCenter, {
        foreignKey: 'nationalCenterId',
        as: 'nationalCenter',
      })
      EventReportPilotNationalCenterUser.belongsTo(models.EventReportPilot, {
        foreignKey: 'eventReportPilotId',
        as: 'event',
        onDelete: 'CASCADE',
      })
      EventReportPilotNationalCenterUser.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user',
      })

      models.User.hasMany(EventReportPilotNationalCenterUser, {
        foreignKey: 'userId',
        as: 'eventReportPilotNationalCenterUsers',
      })
      models.EventReportPilot.hasMany(EventReportPilotNationalCenterUser, {
        foreignKey: 'eventReportPilotId',
        as: 'eventReportPilotNationalCenterUsers',
      })
      models.NationalCenter.hasMany(EventReportPilotNationalCenterUser, {
        foreignKey: 'nationalCenterId',
        as: 'eventReportPilotNationalCenterUsers',
      })
    }
  }

  EventReportPilotNationalCenterUser.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      eventReportPilotId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'EventReportPilots',
            key: 'id',
          },
        },
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'Users',
            key: 'id',
          },
        },
      },
      userName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      nationalCenterId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'NationalCenters',
            key: 'id',
          },
        },
      },
      nationalCenterName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'EventReportPilotNationalCenterUser',
    }
  )
  return EventReportPilotNationalCenterUser
}
