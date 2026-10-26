const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ObjectiveCollaboratorActivityReport extends Model {
    static associate(models) {
      models.ObjectiveCollaboratorActivityReport.belongsTo(models.ObjectiveCollaborator, {
        foreignKey: 'objectiveCollaboratorId',
        as: 'objectiveCollaborator',
      });
      models.ObjectiveCollaborator.hasMany(models.ObjectiveCollaboratorActivityReport, {
        foreignKey: 'objectiveCollaboratorId',
        as: 'activityReportLinks',
      });

      models.ObjectiveCollaboratorActivityReport.belongsTo(models.ActivityReport, {
        foreignKey: 'activityReportId',
        as: 'activityReport',
      });
      models.ActivityReport.hasMany(models.ObjectiveCollaboratorActivityReport, {
        foreignKey: 'activityReportId',
        as: 'objectiveCollaboratorLinks',
      });
    }
  }
  ObjectiveCollaboratorActivityReport.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      objectiveCollaboratorId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: {
            tableName: 'ObjectiveCollaborators',
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
      modelName: 'ObjectiveCollaboratorActivityReport',
      tableName: 'ObjectiveCollaboratorActivityReports',
      indexes: [
        {
          unique: true,
          fields: ['objectiveCollaboratorId', 'activityReportId'],
          name: 'objective_collaborator_activity_reports_unique',
        },
        {
          fields: ['activityReportId'],
          name: 'objective_collaborator_activity_reports_report_id',
        },
      ],
    }
  );
  return ObjectiveCollaboratorActivityReport;
};
