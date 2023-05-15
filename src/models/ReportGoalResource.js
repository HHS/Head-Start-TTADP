const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportGoalResource extends Model {
    static associate(models) {
      ReportGoalResource.belongsTo(models.ReportGoal, {
        foreignKey: 'reportGoalId',
        onDelete: 'cascade',
        as: 'reportGoal',
      });
      ReportGoalResource.belongsTo(models.Resource, {
        foreignKey: 'resourceId',
        as: 'resource',
      });
      models.ReportGoal.hasMany(models.ReportGoalResource, {
        foreignKey: 'reportGoalId',
        as: 'reportGoalResources',
      });
      models.ReportGoal.belongsToMany(models.Resource, {
        through: models.ReportGoalResource,
        foreignKey: 'reportGoalId',
        otherKey: 'resourceId',
        as: 'resources',
      });
      models.Resource.belongsToMany(models.ReportGoal, {
        through: models.ReportGoalResource,
        foreignKey: 'resourceId',
        otherKey: 'reportGoalId',
        as: 'reportGoals',
      });
    }
  }
  ReportGoalResource.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportGoalId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goalResourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(
        Object.values(SOURCE_FIELD.REPORTGOAL), // TODO: fix enum
      ))),
    },
    // isAutoDetected: {
    //   type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
    //   get() {
    //     // eslint-disable-next-line global-require
    //     const { calculateIsAutoDetectedForActivityReportGoal } = require('../services/resource');
    //     return calculateIsAutoDetectedForActivityReportGoal(this.get('sourceFields'));
    //   },
    // },
  }, {
    sequelize,
    modelName: 'ReportGoalResource',
  });
  return ReportGoalResource;
};
