const {
  Model,
  Op,
} = require('sequelize');
const { CLOSE_SUSPEND_REASONS } = require('@ttahub/common');
const { REPORT_TYPE, ENTITY_TYPE } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
const { generateJunctionTableAssociations } = require('./helpers/associations');

export default (sequelize, DataTypes) => {
  class ReportGoal extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportGoal,
        [
          models.Report,
          models.Goal,
          models.Status,
        ],
      );

      // TODO: fix
      [
        {
          model: models.Report,
          prefix: 'report',
        },
        {
          model: models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_SESSION] }),
          prefix: 'reportTrainingSession',
        }
      ].forEach(({
        model,
        prefix,
      }) => {
        models.ReportGoal.belogsTo(model, {
          foreignKey: 'reportId',
          as: prefix,
        });
        model.hasMany(models.ReportGoal, {
          foreignKey: 'reportId',
          as: 'reportGoals',
        });

        model.belongsToMany(models.Goal, {
          through: models.ReportGoal,
          foreignKey: 'reportId',
          otherKey: 'goalId',
          as: 'goals',
        });

        models.Goal.belongsToMany(model, {
          through: models.ReportGoal,
          foreignKey: 'goalId',
          otherKey: 'reportId',
          as: `${prefix}s`,
        });
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
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Goals',
        },
        key: 'id',
      },
    },
    // TODO: add foreignKey linking GoalTemplate & ReportGoalTemplate
    name: DataTypes.TEXT,
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Statuses',
        },
        key: 'id',
      },
    },
    timeframe: DataTypes.TEXT,
    closeSuspendReasonId: {
      type: DataTypes.INTEGER,
      allowNull: true,
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
