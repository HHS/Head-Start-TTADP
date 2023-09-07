const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportObjectiveResource extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveResource.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportObjectiveId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportObjectives',
        },
        key: 'id',
      },
    },
    resourceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Resources',
        },
        key: 'id',
      },
    },
    objectiveResourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'ObjectiveResources',
        },
        key: 'id',
      },
    },
    sourceFields: {
      allowNull: true,
      default: null,
      type: DataTypes.ARRAY((DataTypes.ENUM(
        Object.values(SOURCE_FIELD.REPORTOBJECTIVE), // TODO: fix enum
      ))),
    },
    // isAutoDetected: {
    //   type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['sourceFields']),
    //   get() {
    //     // eslint-disable-next-line global-require
    //     const {
    //      calculateIsAutoDetectedForActivityReportObjective,
    //     } = require('../services/resource');
    //     return calculateIsAutoDetectedForActivityReportObjective(this.get('sourceFields'));
    //   },
    // },
    userProvidedUrl: {
      type: new DataTypes.VIRTUAL(DataTypes.TEXT),
      get() {
        return this.resource && this.resource.url
          ? this.resource.url
          : '';
      },
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveResource',
  });
  return ReportObjectiveResource;
};
