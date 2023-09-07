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
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportTrainingSession extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
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
          tableName: 'ReportTrainingEvents',
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
