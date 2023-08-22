const {
  Model,
  Op,
} = require('sequelize');
const { REPORT_TYPE, ENTITY_TYPE } = require('../constants');
const { generateJunctionTableAssociations } = require('./helpers/associations');

export default (sequelize, DataTypes) => {
  class ReportObjective extends Model {
    static associate(models) {
      generateJunctionTableAssociations(
        models.ReportObjective,
        [
          models.Report,
          models.Objective,
          models.ReportGoal,
        ],
      );
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
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    objectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Objectives',
        },
        key: 'id',
      },
    },
    reportGoalId: {
      type: DataTypes.BIGINT,
      allowNull: true,
      references: {
        model: {
          tableName: 'ReportGoals',
        },
        key: 'id',
      },
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
