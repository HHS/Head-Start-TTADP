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

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION).hasMany(models.ReportGoal, {
        foreignKey: 'reportId',
        as: 'reportGoals',
      });
      models.Goal.hasMany(models.ReportGoal, {
        foreignKey: 'goalId',
        as: 'reportGoals',
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION).belongsToMany(models.Goal, {
        through: models.ReportGoal,
        foreignKey: 'reportId',
        otherKey: 'goalId',
        as: 'goals',
      });
      models.Goal.belongsToMany(models.Report.scope(ENTITY_TYPE.REPORT_SESSION), {
        through: models.ReportGoal,
        foreignKey: 'reportId',
        otherKey: 'goalId',
        as: 'reports',
      });
    }
  }
  ReportGoal.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: DataTypes.TEXT,
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
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
    currentStatus: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.status ? this.status.name : null;
      },
      async set(value) {
        const status = await sequelize.models.Status
          .scope({ method: ['validFor', ENTITY_TYPE.GOAL] })
          .findOne({ where: { name: value } });
        if (status) {
          this.setDataValue('statusId', status.id);
        } else {
          throw new Error(`Invalid status name of ${value} for Goal`);
        }
      },
    },
  }, {
    sequelize,
    modelName: 'ReportGoal',
  });
  return ReportGoal;
};
