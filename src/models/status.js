const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, ENTITY_TYPE } = require('../constants');

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

      Status.belongsTo(models.ValidFor, {
        foreignKey: 'validForId',
        as: 'validFor',
      });

      models.ValidFor.hasMany(models.Status, {
        foreignKey: 'validForId',
        as: 'validForStatuses',
      });

      Status.addScope('validFor', (name) => ({
        includes: [{
          model: models.ValidFor,
          as: 'validFor',
          attributes: [],
          required: true,
          where: { name },
        }],
      }));

      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] })
        .belongsTo(models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_TRAINING_EVENT] }), {
          foreignKey: 'statusId',
          as: 'eventStatus',
        });

      models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_TRAINING_EVENT] })
        .hasMany(models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] }), {
          foreignKey: 'statusId',
          as: 'eventReports',
        });

      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_SESSION] })
        .belongsTo(models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_TRAINING_SESSION] }), {
          foreignKey: 'statusId',
          as: 'sessionStatus',
        });

      models.Status.scope({ method: ['validFor', ENTITY_TYPE.REPORT_TRAINING_SESSION] })
        .hasMany(models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_SESSION] }), {
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

      models.Status.addScope('defaultScope', {
        include: [{
          model: models.Status,
          as: 'mapsToStatus',
          required: false,
        }],
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
    },
    isTerminal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      default: false,
    },
    validForId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToStatus').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToStatus').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'Status',
    paranoid: true,
  });
  return Status;
};
