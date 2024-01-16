const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class EventReportPilotGoals extends Model {
    static associate(models) {
      EventReportPilotGoals.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
      EventReportPilotGoals.belongsTo(models.EventReportPilot, { foreignKey: 'eventId', as: 'event' });
      EventReportPilotGoals.belongsTo(models.SessionReportPilot, { foreignKey: 'sessionId', as: 'session' });
      EventReportPilotGoals.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });

      models.Goal.hasMany(models.EventReportPilotGoal, { foreignKey: 'goalId', as: 'eventReportPilotGoals' });
      models.EventReportPilot.hasMany(models.EventReportPilotGoal, { foreignKey: 'eventId', as: 'eventReportPilotGoals' });
      models.SessionReportPilot.hasMany(models.EventReportPilotGoal, { foreignKey: 'sessionId', as: 'eventReportPilotGoals' });
      models.Grant.hasMany(models.EventReportPilotGoal, { foreignKey: 'grantId', as: 'eventReportPilotGoals' });

      models.Goal.belongsToMany(models.EventReportPilot, { through: models.EventReportPilotGoal, foreignKey: 'goalId', as: 'eventReportPilots' });
      models.EventReportPilot.belongsToMany(models.Goal, { through: models.EventReportPilotGoal, foreignKey: 'eventId', as: 'eventReportPilots' });
      models.Grant.belongsToMany(models.EventReportPilot, { through: models.EventReportPilotGoal, foreignKey: 'grantId', as: 'eventReportPilots' });
      models.EventReportPilot.belongsToMany(models.Grant, { through: models.EventReportPilotGoal, foreignKey: 'grantId', as: 'eventReportPilots' });
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
