const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportObjective extends Model {
    static associate(models) {
      ReportObjective.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportObjective.belongsTo(models.Objective, {
        foreignKey: 'objectiveId',
        as: 'objective',
      });
      ReportObjective.belongsTo(models.ReportGoal, {
        foreignKey: 'reportGoalId',
        as: 'reportGoal',
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .hasMany(models.ReportObjective, {
          foreignKey: 'reportId',
          as: 'reportObjectives',
        });

      models.Objective.hasMany(models.ReportObjective, {
        foreignKey: 'objectiveId',
        as: 'objective',
      });

      models.ReportGoal.hasMany(models.ReportObjective, {
        foreignKey: 'reportGoalId',
        as: 'reportObjectives',
      });
    }
  }
  ReportObjective.init({
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
    objectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reportGoalId: {
      type: DataTypes.BIGINT,
      allowNull: true,
    },
    ordinal: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    title: DataTypes.TEXT,
    statusId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ttaProvided: DataTypes.TEXT,
    currentStatus: {
      type: DataTypes.VIRTUAL,
      get() {
        return this.status ? this.status.name : null;
      },
      async set(value) {
        const status = await sequelize.models.Status
          .scope({ method: ['validFor', ENTITY_TYPE.OBJECTIVE] })
          .findOne({ where: { name: value } });
        if (status) {
          this.setDataValue('statusId', status.id);
        } else {
          throw new Error(`Invalid status name of ${value} for Objective`);
        }
      },
    },
  }, {
    sequelize,
    modelName: 'ReportObjective',
  });
  return ReportObjective;
};
