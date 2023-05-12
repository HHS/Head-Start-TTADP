const {
  Model,
  Op,
} = require('sequelize');
const { CLOSE_SUSPEND_REASONS } = require('@ttahub/common');
const { ENTITY_TYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

export default (sequelize, DataTypes) => {
  class ReportGoal extends Model {
    static associate(models) {
      ReportGoal.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportGoal.belongsTo(models.Goal, {
        foreignKey: 'goalId',
        as: 'goal',
      });
      ReportGoal.hasMany(models.ReportGoalResource, {
        foreignKey: 'reportGoalId',
        as: 'reportGoalResources',
      });
      ReportGoal.hasMany(models.ReportGoalFieldResponse, {
        foreignKey: 'reportGoalId',
        as: 'reportGoalFieldResponses',
      });
      ReportGoal.belongsToMany(models.Resource, {
        through: models.ReportGoalResource,
        foreignKey: 'reportGoalId',
        otherKey: 'resourceId',
        as: 'resources',
      });

      models.Report.hasMany(models.ReportGoal, {
        foreignKey: 'reportId',
        as: 'reportGoals',
        scope: {
          [sequelize.col('"Report".reportType')]: {
            [Op.in]: [
              ENTITY_TYPE.REPORT_EVENT,
              ENTITY_TYPE.REPORT_SESSION,
            ],
          },
        },
      });
    }
  }
  ReportGoal.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.TEXT,
    closeSuspendReason: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(CLOSE_SUSPEND_REASONS).map((k) => CLOSE_SUSPEND_REASONS[k])),
    },
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    closeSuspendContext: {
      type: DataTypes.TEXT,
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportGoal',
  });
  return ReportGoal;
};
