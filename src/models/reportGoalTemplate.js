const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplate extends Model {
    static associate(models) {
      ReportGoalTemplate.belongsTo(models.Report, { foreignKey: 'reportId', as: 'report' });
      ReportGoalTemplate.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: 'goalTemplate' });
      ReportGoalTemplate.hasMany(models.ReportGoalTemplateResource, { foreignKey: 'reportGoalTemplateId', as: 'reportGoalTemplateResources' });
      ReportGoalTemplate.belongsToMany(models.Resource, {
        through: models.ReportGoalTemplateResource,
        foreignKey: 'reportGoalTemplateId',
        otherKey: 'resourceId',
        as: 'resources',
      });
    }
  }
  ReportGoalTemplate.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    templateName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportGoalTemplate',
  });
  return ReportGoalTemplate;
};
