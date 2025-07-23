const { Model } = require('sequelize');
const { NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
// The below import seems very odd to me that we are bringing in hooks for a different model.
// Its hard to say if this was a mistake or if we are using goal hooks for resource processing.
// One would think if we were using goal hooks in the next steps after create it would be commented.
/*
const {
  afterCreate,
  afterUpdate,
} = require('./hooks/goal');
 */
const {
  afterCreate,
  afterUpdate,
} = require('./hooks/nextStep');

export default (sequelize, DataTypes) => {
  class NextStep extends Model {
    static associate(models) {
      NextStep.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      NextStep.hasMany(models.NextStepResource, { foreignKey: 'nextStepId', as: 'nextStepResources' });
      NextStep.belongsToMany(models.Resource, {
        through: models.NextStepResource,
        foreignKey: 'nextStepId',
        otherKey: 'resourceId',
        as: 'resources',
      });
    }
  }
  NextStep.init({
    activityReportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    note: {
      allowNull: false,
      type: DataTypes.TEXT,
      validate: {
        notNull: true,
        notEmpty: true,
      },
    },
    noteType: {
      allowNull: false,
      type: DataTypes.ENUM(Object.values(NEXTSTEP_NOTETYPE)),
    },
    completeDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
  }, {
    sequelize,
    modelName: 'NextStep',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return NextStep;
};
