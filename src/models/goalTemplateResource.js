const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { afterDestroy } = require('./hooks/goalTemplateResource');

export default (sequelize, DataTypes) => {
  class GoalTemplateResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      GoalTemplateResource.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', onDelete: 'cascade', as: 'goalTemplate' });
      GoalTemplateResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  GoalTemplateResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(Object.values(SOURCE_FIELD.GOALTEMPLATE)))),
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        // eslint-disable-next-line global-require
        const { calculateIsAutoDetectedForGoalTemplate } = require('../services/resource');
        return calculateIsAutoDetectedForGoalTemplate(this.get('sourceFields'));
      },
    },
    isFoiaable: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  }, {
    sequelize,
    modelName: 'GoalTemplateResource',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return GoalTemplateResource;
};
