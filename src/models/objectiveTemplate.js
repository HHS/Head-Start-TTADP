const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ObjectiveTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveTemplate.hasMany(models.Objective, { foreignKey: 'objectiveTemplateId', as: 'objectives' });
      ObjectiveTemplate.hasMany(models.ObjectiveTemplateResource, { foreignKey: 'objectiveTemplateId', as: 'resources' });
      ObjectiveTemplate.belongsToMany(models.Topic, { through: models.ObjectiveTemplateTopic, foreignKey: 'objectiveTemplateId', as: 'topics' });
      ObjectiveTemplate.belongsToMany(models.Role, { through: models.ObjectiveTemplateRole, foreignKey: 'objectiveTemplateId', as: 'roles' });
      ObjectiveTemplate.hasMany(models.GoalTemplateObjectiveTemplate, { foreignKey: 'objectiveTemplateId', as: 'goalTemplateObjectiveTemplates' });
      ObjectiveTemplate.belongsToMany(models.GoalTemplate, {
        through: models.GoalTemplateObjectiveTemplate,
        foreignKey: 'objectiveTemplateId',
        otherKey: 'goalTemplateId',
        as: 'goalTemplates',
      });
    }
  }
  ObjectiveTemplate.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    templateTitle: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    lastUsed: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    templateTitleModifiedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplate',
    hooks: {
      beforeValidate: async (instance) => {
        const changed = instance.changed();
        if (Array.isArray(changed) && changed.includes('templateTitle')) {
          instance.set('templateTitleModifiedAt', new Date());
        }
        if (Array.isArray(changed)
        && (!changed.includes('creationMethod')
        || instance.creationMethod === null
        || instance.creationMethod === undefined)) {
          instance.set('creationMethod', 'Automatic');
        }
      },
    },
  });
  return ObjectiveTemplate;
};
