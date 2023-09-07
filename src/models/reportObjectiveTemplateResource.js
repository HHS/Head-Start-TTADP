const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateResource extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportObjectiveTemplateResource.init({
    id: {
      type: DataTypes.BIGINT,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportObjectiveTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportObjectiveTemplates',
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
    objectiveTemplateResourceId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'ObjectiveTemplateResources',
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
    //    } = require('../services/resource');
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
    modelName: 'ReportObjectiveTemplateResource',
  });
  return ReportObjectiveTemplateResource;
};
