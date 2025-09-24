const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollabReportGoal extends Model {
    static associate(models) {
      CollabReportGoal.belongsTo(models.CollabReport, { foreignKey: 'collabReportId', as: 'collabReport' });
      CollabReportGoal.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: 'goalTemplate' });
    }
  }

  CollabReportGoal.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    collabReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'CollabReports',
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
      comment: 'The actual value a user chooses is a string that is from the GoalTemplates.standard column',
    },
  }, {
    sequelize,
    modelName: 'CollabReportGoal',
    tableName: 'CollabReportGoals',
    paranoid: true,
    timestamps: true, // enables createdAt and updatedAt
    indexes: [
      {
        name: 'collab_report_goals_goal_template_id_collab_report_id',
        unique: true,
        fields: ['collabReportId', 'goalTemplateId'],
      },
    ],
  });

  return CollabReportGoal;
};
