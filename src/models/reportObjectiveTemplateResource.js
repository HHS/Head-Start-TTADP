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
      ReportObjectiveTemplateResource.belongsTo(models.ObjectiveTemplateResource, {
        foreignKey: 'objectiveTemplateResourceId',
        as: 'objectiveTemplateResource',
      });
      models.ObjectiveTemplateResource.hasMany(models.ReportObjectiveTemplateResource, {
        foreignKey: 'objectiveTemplateResourceId',
        as: 'reportObjectiveTemplateResources',
      });
      models.ReportObjectiveTemplate.hasMany(models.ReportObjectiveTemplateResource, {
        foreignKey: 'reportObjectiveTemplateId',
        onDelete: 'cascade',
        as: 'reportObjectiveTemplateResources',
      });
      models.Resource.hasMany(models.ReportObjectiveTemplateResource, {
        foreignKey: 'resourceId',
        as: 'resource',
      });
      models.ReportObjectiveTemplate.belongsToMany(models.Resource, {
        through: models.ReportObjectiveTemplateResource,
        foreignKey: 'reportObjectiveTemplateId',
        otherKey: 'resourceId',
        onDelete: 'cascade',
        as: 'resources',
      });
      models.Resource.belongsToMany(models.ReportObjectiveTemplate, {
        through: models.ReportObjectiveTemplateResource,
        foreignKey: 'resourceId',
        otherKey: 'reportObjectiveTemplateId',
        onDelete: 'cascade',
        as: 'reportObjectiveTemplates',
      });
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
      allowNull: false,
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
