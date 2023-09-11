const {
  Model,
  Op,
} = require('sequelize');
const {
  REPORT_TYPE,
} = require('../constants');
const {
  afterCreate,
} = require('./hooks/reportTrainingSession');
const { generateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportTrainingSession extends Model {
    static associate(models) {
      // automaticallyGenerateJunctionTableAssociations(this, models);

      generateJunctionTableAssociations(
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
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ReportTrainingSession',
  });
  return ReportTrainingSession;
};
