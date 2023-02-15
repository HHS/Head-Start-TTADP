const { Model } = require('sequelize');
const { NEXTSTEP_NOTETYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const {
  afterCreate,
  afterUpdate,
} = require('./hooks/goal');

export default (sequelize, DataTypes) => {
  class NextStep extends Model {
    static associate(models) {
      NextStep.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId' });
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
