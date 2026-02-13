const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class SessionReportPilotGoalTemplate extends Model {
    static associate(models) {
      SessionReportPilotGoalTemplate.belongsTo(models.SessionReportPilot, {
        foreignKey: 'sessionReportPilotId',
        as: 'sessionReportPilot',
      })
      SessionReportPilotGoalTemplate.belongsTo(models.GoalTemplate, {
        foreignKey: 'goalTemplateId',
        as: 'goalTemplate',
      })
    }
  }

  SessionReportPilotGoalTemplate.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      sessionReportPilotId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'SessionReportPilots',
          key: 'id',
        },
      },
      goalTemplateId: {
        allowNull: false,
        type: DataTypes.INTEGER,
        references: {
          model: 'GoalTemplates',
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'SessionReportPilotGoalTemplate',
      tableName: 'SessionReportPilotGoalTemplates',
      timestamps: true,
      indexes: [
        {
          name: 'session_report_pilot_goal_templates_unique',
          unique: true,
          fields: ['sessionReportPilotId', 'goalTemplateId'],
        },
      ],
    }
  )

  return SessionReportPilotGoalTemplate
}
