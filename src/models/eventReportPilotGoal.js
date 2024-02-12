const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class EventReportPilotGoals extends Model {
    static associate(models) {
      EventReportPilotGoals.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
      EventReportPilotGoals.belongsTo(models.EventReportPilot, { foreignKey: 'eventId', as: 'event' });
      EventReportPilotGoals.belongsTo(models.SessionReportPilot, { foreignKey: 'sessionId', as: 'session' });
      EventReportPilotGoals.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });

      models.Goal.hasMany(EventReportPilotGoals, { foreignKey: 'goalId', as: 'eventReportPilotGoals' });
      models.EventReportPilot.hasMany(EventReportPilotGoals, { foreignKey: 'eventId', as: 'eventReportPilotGoals' });
      models.SessionReportPilot.hasMany(EventReportPilotGoals, { foreignKey: 'sessionId', as: 'eventReportPilotGoals' });
      models.Grant.hasMany(EventReportPilotGoals, { foreignKey: 'grantId', as: 'eventReportPilotGoals' });

      models.Goal.belongsToMany(models.EventReportPilot, {
        through: EventReportPilotGoals,
        foreignKey: 'goalId',
        otherKey: 'eventId',
        as: 'eventReportPilots',
      });
      models.EventReportPilot.belongsToMany(models.Goal, {
        through: EventReportPilotGoals,
        foreignKey: 'eventId',
        otherKey: 'goalId',
        as: 'goals',
      });
      models.Grant.belongsToMany(models.EventReportPilot, {
        through: EventReportPilotGoals,
        foreignKey: 'grantId',
        otherKey: 'eventId',
        as: 'eventReports',
      });
      models.EventReportPilot.belongsToMany(models.Grant, {
        through: EventReportPilotGoals,
        foreignKey: 'eventId',
        otherKey: 'grantId',
        as: 'grants',
      });
    }
  }

  EventReportPilotGoals.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Goals',
          key: 'id',
        },
      },
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'EventReportPilots',
          key: 'id',
        },
      },
    },
    sessionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'SessionReportPilots',
          key: 'id',
        },
      },
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Grants',
          key: 'id',
        },
      },
    },
  }, {
    sequelize,
    modelName: 'EventReportPilotGoal',
  });
  return EventReportPilotGoals;
};
