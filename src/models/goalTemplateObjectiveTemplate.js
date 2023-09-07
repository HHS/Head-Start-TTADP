const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class GoalTemplateObjectiveTemplate extends Model {
    static associate(models) {
      GoalTemplateObjectiveTemplate.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: 'goalTemplate' });
      GoalTemplateObjectiveTemplate.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', as: 'objectiveTemplate' });
    }
  }
  GoalTemplateObjectiveTemplate.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'GoalTemplates' }, key: 'id' },
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'ObjectiveTemplates' }, key: 'id' },
    },
  }, {
    sequelize,
    modelName: 'GoalTemplateObjectiveTemplate',
  });
  return GoalTemplateObjectiveTemplate;
};
