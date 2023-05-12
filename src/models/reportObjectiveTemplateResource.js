const { Model } = require('sequelize');
const { SOURCE_FIELD } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplateResource extends Model {
    static associate(models) {
      ReportObjectiveTemplateResource.belongsTo(models.ReportObjectiveTemplate, {
        foreignKey: 'reportObjectiveTemplateId',
        onDelete: 'cascade',
        as: 'reportObjectiveTemplate',
      });
      ReportObjectiveTemplateResource.belongsTo(models.Resource, {
        foreignKey: 'resourceId',
        as: 'resource',
      });
    }
  }
  ReportObjectiveTemplateResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    reportObjectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    resourceId: {
      type: DataTypes.INTEGER,
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
    //     const { calculateIsAutoDetectedForActivityReportObjective } = require('../services/resource');
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
