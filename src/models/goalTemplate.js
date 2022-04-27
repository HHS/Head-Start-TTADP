const { Model } = require('sequelize');
const { CREATION_METHOD } = require('../constants');
// const { auditLogger } = require('../logger');

module.exports = (sequelize, DataTypes) => {
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
      beforeValidate: async (instance) => {
        const changed = instance.changed();
        if (Array.isArray(changed) && changed.includes('templateName')) {
          instance.set('templateNameModifiedAt', new Date());
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
  return GoalTemplate;
};
