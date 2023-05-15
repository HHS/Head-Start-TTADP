const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportGoalTemplate extends Model {
    static associate(models) {
      ReportGoalTemplate.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportGoalTemplate.belongsTo(models.GoalTemplate, {
        foreignKey: 'goalTemplateId',
        as: 'goalTemplate',
      });

      models.Report.hasMany(models.ReportGoalTemplate, {
        foreignKey: 'reportId',
        as: 'reportGoalTemplates',
        scope: {
          [sequelize.col('"Report".reportType')]: {
            [Op.in]: [
              ENTITY_TYPE.REPORT_EVENT,
              ENTITY_TYPE.REPORT_SESSION,
            ],
          },
        },
      });
      models.GoalTemplate.hasMany(models.ReportGoalTemplate, {
        foreignKey: 'goalTemplateId',
        as: 'reportGoalTemplates',
      });
      models.GoalTemplate.belongsToMany(models.Report, {
        through: models.ReportGoalTemplate,
        foreignKey: 'goalTemplateId',
        otherKey: 'reportId',
        as: 'reports',
      });
      models.Report.belongsToMany(models.GoalTemplate, {
        through: models.ReportGoalTemplate,
        foreignKey: 'reportId',
        otherKey: 'goalTemplateId',
        as: 'goalTemplates',
      });
    }
  }
  ReportGoalTemplate.init({
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
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    templateName: {
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
    modelName: 'ReportGoalTemplate',
  });
  return ReportGoalTemplate;
};
