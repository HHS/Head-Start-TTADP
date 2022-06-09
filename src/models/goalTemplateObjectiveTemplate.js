const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoalTemplateObjectiveTemplate extends Model {
    static associate(models) {
      GoalTemplateObjectiveTemplate.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: 'goalTemplate' });
      GoalTemplateObjectiveTemplate.belongsTo(models.ObjectiveTemplate, { foreignKey: 'fileId', as: 'objectiveTemplate' });
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
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'GoalTemplateObjectiveTemplate',
  });
  return GoalTemplateObjectiveTemplate;
};
