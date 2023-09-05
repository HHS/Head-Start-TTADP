const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportGoalResource extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportGoalResource,
        [
          models.ReportGoal,
          models.Resource,
          models.GoalResource,
        ],
      );
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
      references: {
        model: {
          tableName: 'ReportGoals',
        },
        key: 'id',
      },
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Resources',
        },
        key: 'id',
      },
    },
    goalResourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'GoalResources',
        },
        key: 'id',
      },
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
