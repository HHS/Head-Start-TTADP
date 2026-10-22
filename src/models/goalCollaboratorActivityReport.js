const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GoalCollaboratorActivityReport extends Model {
    static associate(models) {
      models.GoalCollaboratorActivityReport.belongsTo(models.GoalCollaborator, {
        foreignKey: 'goalCollaboratorId',
        as: 'goalCollaborator',
      });
      models.GoalCollaborator.hasMany(models.GoalCollaboratorActivityReport, {
        foreignKey: 'goalCollaboratorId',
        as: 'activityReportLinks',
      });

      models.GoalCollaboratorActivityReport.belongsTo(models.ActivityReport, {
        foreignKey: 'activityReportId',
        as: 'activityReport',
      });
      models.ActivityReport.hasMany(models.GoalCollaboratorActivityReport, {
        foreignKey: 'activityReportId',
        as: 'goalCollaboratorLinks',
      });
    }
  }
  GoalCollaboratorActivityReport.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      goalCollaboratorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'GoalCollaborators',
          },
          key: 'id',
        },
      },
      activityReportId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'ActivityReports',
          },
          key: 'id',
        },
      },
    },
    {
      sequelize,
      modelName: 'GoalCollaboratorActivityReport',
      tableName: 'GoalCollaboratorActivityReports',
      indexes: [
        {
          unique: true,
          fields: ['goalCollaboratorId', 'activityReportId'],
          name: 'goal_collaborator_activity_reports_unique',
        },
        {
          fields: ['activityReportId'],
          name: 'goal_collaborator_activity_reports_report_id',
        },
      ],
    }
  );
  return GoalCollaboratorActivityReport;
};
