const { Model } = require('sequelize');
const { CREATION_METHOD } = require('../constants');
const { beforeValidate, beforeUpdate, afterUpdate } = require('./hooks/goalTemplate');
// const { auditLogger } = require('../logger');

export default (sequelize, DataTypes) => {
  class GoalTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      GoalTemplate.hasMany(models.Goal, { foreignKey: 'goalTemplateId', as: 'goals' });
      GoalTemplate.belongsTo(models.Region, { foreignKey: 'regionId' });
      GoalTemplate.hasMany(
        models.GoalTemplateObjectiveTemplate,
        { foreignKey: 'goalTemplateId', as: 'goalTemplateObjectiveTemplates' },
      );
      GoalTemplate.belongsToMany(models.ObjectiveTemplate, {
        through: models.GoalTemplateObjectiveTemplate,
        foreignKey: 'goalTemplateId',
        otherKey: 'objectiveTemplateId',
        as: 'goalTemplates',
      });
    }
  }
  GoalTemplate.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    hash: {
      allowNull: false,
      type: DataTypes.TEXT,
    },
    templateName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    creationMethod: {
      allowNull: false,
      type: DataTypes.ENUM(Object.keys(CREATION_METHOD).map((k) => CREATION_METHOD[k])),
    },
    lastUsed: {
      allowNull: true,
      type: DataTypes.DATE,
    },
    templateNameModifiedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'GoalTemplate',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return GoalTemplate;
};
