const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Status extends Model {
    static associate(models) {
      Status.belongsTo(models.Status, {
        foreignKey: 'mapsTo',
        as: 'mapsToStatus',
      });
      Status.hasMany(models.Status, {
        foreignKey: 'mapsTo',
        as: 'mapsFromStatuses',
      });
      Status.belongsTo(models.Report, {
        foreignKey: 'statusId',
        as: 'report',
      });

      Status.addScope('validFor', (validFor) => ({
        where: { validFor },
      }));

      models.Report.scope(ENTITY_TYPE.REPORT_EVENT)
        .belongsTo(models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_EVENT] }), {
          foreignKey: 'statusId',
          as: 'eventStatus',
        });

      models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_EVENT] })
        .hasMany(models.Report.scope(ENTITY_TYPE.REPORT_EVENT), {
          foreignKey: 'statusId',
          as: 'eventReports',
        });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .belongsTo(models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_SESSION] }), {
          foreignKey: 'statusId',
          as: 'sessionStatus',
        });

      models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_SESSION] })
        .hasMany(models.Report.scope(ENTITY_TYPE.REPORT_SESSION), {
          foreignKey: 'statusId',
          as: 'sessionReports',
        });

      models.ReportGoal.belongsTo(models.Status.scope({ method: ['validFor', ENTITY_TYPE.GOAL] }), {
        foreignKey: 'statusId',
        as: 'status',
      });

      models.Status.scope({ method: ['validFor', ENTITY_TYPE.GOAL] }).hasMany(models.ReportGoal, {
        foreignKey: 'statusId',
        as: 'reportGoals',
      });

      models.ReportObjective.belongsTo(models.Status.scope({ method: ['validFor', ENTITY_TYPE.OBJECTIVE] }), {
        foreignKey: 'statusId',
        as: 'status',
      });

      models.Status.scope({ method: ['validFor', ENTITY_TYPE.OBJECTIVE] }).hasMany(models.ReportObjective, {
        foreignKey: 'statusId',
        as: 'reportObjectives',
      });
    }
  }
  Status.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    validFor: {
      type: DataTypes.ENUM(Object.values(ENTITY_TYPE)),
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Status',
    paranoid: true,
  });
  return Status;
};
