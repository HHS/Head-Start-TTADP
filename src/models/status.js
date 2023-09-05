const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, ENTITY_TYPE } = require('../constants');
const {
  camelToPascalCase,
  generateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Status extends Model {
    static preloadScopes(models) {
      models.Status.belongsTo(models.Status, {
        foreignKey: 'mapsTo',
        as: 'mapsToStatus',
      });
      models.Status.hasMany(models.Status, {
        foreignKey: 'mapsTo',
        as: 'mapsFromStatuses',
      });

      generateJunctionTableAssociations(
        models.Status,
        [models.ValidFor],
      );

      models.Status.addScope('defaultScope', {
        include: [{
          model: models.Status,
          as: 'mapsToStatus',
          required: false,
        }],
      });

      models.Status.addScope('validFor', (name) => ({
        includes: [{
          model: models.ValidFor,
          as: 'validFor',
          attributes: [],
          required: true,
          where: { name },
        }],
      }));
    }

    static associate(models) {
      Status.belongsTo(models.Report, {
        foreignKey: 'statusId',
        as: 'report',
      });

      [
        {
          model: models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] }),
          type: ENTITY_TYPE.REPORT_TRAINING_EVENT,
          prefix: 'reportTrainingEvent',
        },
        {
          model: models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_SESSION] }),
          type: ENTITY_TYPE.REPORT_TRAINING_SESSION,
          prefix: 'reportTrainingSession',
        },
        {
          model: models.ReportGoal,
          type: ENTITY_TYPE.GOAL,
          prefix: 'reportGoal',
        },
        {
          model: models.ReportObjective,
          type: ENTITY_TYPE.OBJECTIVE,
          prefix: 'reportObjective',
        },
      ].forEach(({
        model,
        type,
        prefix,
      }) => {
        model.belongsTo(models.Status.scope({ method: ['validFor', type] }), {
          foreignKey: 'statusId',
          as: `${prefix}Status`,
        });
        models.Status.scope({ method: ['validFor', type] }).hasMany(model, {
          foreignKey: 'statusId',
          as: `${prefix}s`,
        });
      });
    }
  }
  Status.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
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
      references: {
        model: {
          tableName: 'ValidFor',
        },
        key: 'id',
      },
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
