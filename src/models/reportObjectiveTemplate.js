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
        as: 'objectiveTemplate',
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
      models.ObjectiveTemplate.hasMany(models.ReportObjectiveTemplate, {
        foreignKey: 'objectiveTemplateId',
        as: 'reportObjectiveTemplates',
      });
    }
  }
  ReportObjectiveTemplate.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.BIGINT,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reportGoalTemplateId: {
      type: DataTypes.BIGINT,
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
