const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class EventReportPilotGoals extends Model {
    static associate(models) {
      EventReportPilotGoals.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
      EventReportPilotGoals.belongsTo(models.EventReportPilot, { foreignKey: 'eventId', as: 'event' });

      models.Goal.hasMany(models.EventReportPilotGoal, { foreignKey: 'goalId', as: 'eventReportPilotGoals' });
      models.EventReportPilot.hasMany(models.EventReportPilotGoal, { foreignKey: 'eventId', as: 'eventReportPilotGoals' });
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
  }, {
    sequelize,
    modelName: 'EventReportPilotGoal',
  });
  return EventReportPilotGoals;
};
