const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
  TRAINING_TYPE,
  AUDIENCE,
  ORGANIZER,
} = require('../constants');

export default (sequelize, DataTypes) => {
  class EventReport extends Model {
    static associate(models) {
      EventReport.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      EventReport.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });

      models.Report.hasOne(models.EventReport, {
        foreignKey: 'reportId',
        as: 'event',
        scope: { [sequelize.col('"Report".reportType')]: ENTITY_TYPE.REPORT_EVENT },
      });
      models.Report.addScope(ENTITY_TYPE.REPORT_EVENT, {
        where: {
          reportType: ENTITY_TYPE.REPORT_EVENT,
        },
        include: [
          {
            model: models.ReportApproval,
            as: 'approval',
            required: true,
            where: {
              submissionStatus: {
                [Op.ne]: 'deleted',
              },
            },
          },
          {
            model: models.EventReport,
            as: 'eventReport',
          },
          {
            model: models.Reason,
            as: 'reasons',
            through: {
              attributes: [],
            },
          },
          {
            model: models.TargetPopulation,
            as: 'targetPopulations',
            through: {
              attributes: [],
            },
          },
          {
            model: models.ReportGoalTemplate,
            as: 'reportGoalTemplates',
          },
        ],
      });
    }
  }
  EventReport.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    organizerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    audience: {
      type: DataTypes.ARRAY(DataTypes.ENUM(Object.values(AUDIENCE))),
      allowNull: false,
    },
    trainingType: {
      type: DataTypes.ENUM(Object.values(TRAINING_TYPE)),
      allowNull: false,
      defaultValue: TRAINING_TYPE.SERIES,
    },
    vision: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'EventReport',
  });
  return EventReport;
};
