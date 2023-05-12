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

      models.Report.addScope(ENTITY_TYPE.REPORT_EVENT, {
        where: {
          reportType: ENTITY_TYPE.REPORT_EVENT,
        },
        include: [{
          model: models.Status,
          as: 'status',
          required: true,
          where: {
            name: {
              [Op.ne]: 'deleted',
            },
          },
        }],
      });

      models.Report.scope(ENTITY_TYPE.REPORT_EVENT).hasOne(models.EventReport, {
        foreignKey: 'reportId',
        as: 'event',
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
