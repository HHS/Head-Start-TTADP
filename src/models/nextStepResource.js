const { Model } = require('sequelize');
// const { beforeDestroy, afterDestroy } = require('./hooks/nextStepResource');

module.exports = (sequelize, DataTypes) => {
  class NextStepResource extends Model {
    static associate(models) {
      NextStepResource.belongsTo(models.NextStep, { foreignKey: 'nextStepId', as: 'nextStep' });
      NextStepResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  NextStepResource.init({
    nextStepId: {
      type: DataTypes.INTEGER,
    },
    resourceId: {
      type: DataTypes.INTEGER,
    },
    isAutoDetected: {
      type: DataTypes.BOOLEAN,
      default: false,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'NextStepResource',
    // hooks: {
    //   beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    //   afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    // },
  });
  return NextStepResource;
};
