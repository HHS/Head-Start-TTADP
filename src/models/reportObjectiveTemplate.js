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

      ReportObjectiveTemplate.belongsTo(models.ReportGoalTemplate, {
        foreignKey: 'reportGoalTemplateId',
        as: 'reportGoalTemplate',
      });

      models.ReportGoalTemplate.hasMany(models.ReportObjectiveTemplate, {
        foreignKey: 'reportGoalTemplateId',
        as: 'reportObjectiveTemplates',
      });

      // TODO: switch to scope model, my require relocating
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
      // TODO: add both through associations between report and ObjectiveTemplate
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
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ObjectiveTemplates',
        },
        key: 'id',
      },
    },
    reportGoalTemplateId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportGoalTemplates',
        },
        key: 'id',
      },
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
