const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { afterDestroy } = require('./hooks/nextStepResource');

export default (sequelize, DataTypes) => {
  class NextStepResource extends Model {
    static associate(models) {
      NextStepResource.belongsTo(models.NextStep, { foreignKey: 'nextStepId', as: 'nextStep' });
      NextStepResource.belongsTo(models.Resource, { foreignKey: 'resourceId', as: 'resource' });
    }
  }
  NextStepResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    nextStepId: {
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
      type: DataTypes.ARRAY((DataTypes.ENUM(Object.values(SOURCE_FIELD.NEXTSTEPS)))),
    },
    isAutoDetected: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
      get() {
        // eslint-disable-next-line global-require
        const { calculateIsAutoDetectedForNextStep } = require('../services/resource');
        return calculateIsAutoDetectedForNextStep(this.get('sourceFields'));
      },
    },
  }, {
    sequelize,
    modelName: 'NextStepResource',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return NextStepResource;
};
