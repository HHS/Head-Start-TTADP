const {
  Model,
  Op,
} = require('sequelize');
const {
  REPORT_TYPE,
} = require('../constants');
const {
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
  beforeDestroy,
} = require('./hooks/reportTrainingSession');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportTrainingSession extends Model {
    static async associate(models) {
      // automaticallyGenerateJunctionTableAssociations(this, models);

      await generateJunctionTableAssociations(
        this,
        [
          models.Report,
          models.Report,
          models.Region,
        ],
        {
          models: [
            {
            },
            {
              scope: {
                method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT],
              },
              as: 'reportTrainingEvent',
              suffixes: ['reportTrainingEvent'],
              skipNull: true,
            },
            {
            },
          ],
        },
      );
    }
  }
  ReportTrainingSession.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
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
    reportTrainingEventId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Regions',
        },
        key: 'id',
      },
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ReportTrainingSession',
  });
  return ReportTrainingSession;
};
