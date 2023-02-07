const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
// const { beforeValidate, afterCreate, afterDestroy } = require('./hooks/goalResource');
const { calculateIsAutoDetectedForGoalTemplate } = require('../services/resource');

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
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(Object.values(SOURCE_FIELD.GOALTEMPLATE)))),
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        return calculateIsAutoDetectedForGoalTemplate(this.get('sourceFields'));
      },
    },
  }, {
    sequelize,
    modelName: 'GoalTemplateResource',
    // hooks: {
    //   beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
    //   afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    //   afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    // },
  });
  return GoalTemplateResource;
};
