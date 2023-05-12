const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
} = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportObjectiveTemplate extends Model {
    static associate(models) {
      ReportObjectiveTemplate.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportObjectiveTemplate.belongsTo(models.ObjectiveTemplate, {
        foreignKey: 'objectiveTemplateId',
        as: 'ObjectiveTemplate',
      });
      ReportObjectiveTemplate.hasMany(models.ReportObjectiveTemplateResource, {
        foreignKey: 'reportObjectiveTemplateId',
        as: 'reportObjectiveTemplateResources',
      });
      ReportObjectiveTemplate.belongsToMany(models.Resource, {
        through: models.ReportObjectiveTemplateResource,
        foreignKey: 'reportObjectiveTemplateId',
        otherKey: 'resourceId',
        as: 'resources',
      });

      models.Report.hasMany(models.ReportObjectiveTemplate, {
        foreignKey: 'reportId',
        as: 'reportObjectiveTemplates',
        scope: {
          [sequelize.col('"Report".reportType')]: {
            [Op.in]: [
              ENTITY_TYPE.REPORT_SESSION,
            ],
          },
        },
      });
    }
  }
  ReportObjectiveTemplate.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    templateTitle: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    isActivelyEdited: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ReportObjectiveTemplate',
  });
  return ReportObjectiveTemplate;
};
