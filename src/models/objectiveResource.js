const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { afterCreate, afterDestroy } = require('./hooks/objectiveResource');

module.exports = (sequelize, DataTypes) => {
  class ObjectiveResource extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveResource.belongsTo(models.Objective, { foreignKey: 'objectiveId', onDelete: 'cascade', as: 'objectiveResource' });
      ObjectiveResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  ObjectiveResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    userProvidedUrl: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    objectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
    },
    sourceField: {
      allowNull: true,
      default: null,
      type: DataTypes.ENUM(Object.values(SOURCE_FIELD.OBJECTIVE)),
    },
    isAutoDetected: {
      type: DataTypes.BOOLEAN,
      default: false,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveResource',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ObjectiveResource;
};
