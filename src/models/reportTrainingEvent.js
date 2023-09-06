const {
  Model,
  Op,
} = require('sequelize');
const {
  REPORT_TYPE,
  TRAINING_TYPE,
  AUDIENCE,
  ORGANIZER,
} = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportTrainingEvent extends Model {
    static associate(models) {
      ReportTrainingEvent.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportTrainingEvent.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });

      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] })
        .hasOne(models.ReportTrainingEvent, {
          foreignKey: 'reportId',
          as: 'event',
        });
      models.Region.hasMany(models.ReportTrainingEvent, {
        foreignKey: 'regionId',
        as: 'event',
      });

      // Organizer
      models.Organizer.hasMany(models.ReportTrainingEvent, {
        foreignKey: 'organizerId',
        as: 'reportTrainingEvents',
      });

      models.ReportTrainingEvent.belongsTo(models.Organizer, {
        foreignKey: 'organizerId',
        as: 'organizer',
      });

      models.Organizer.belongsToMany(models.Report
        .scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] }), {
        through: models.ReportTrainingEvent,
        foreignKey: 'organizerId',
        otherKey: 'reportId',
        as: 'reports',
      });

      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_EVENT] })
        .belongsToMany(models.Organizer, {
          through: models.ReportTrainingEvent,
          foreignKey: 'reportId',
          otherKey: 'organizerId',
          as: 'organizer',
        });
    }
  }
  ReportTrainingEvent.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
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
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Regions',
        },
        key: 'id',
      },
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
      unique: true,
    },
    organizerId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Organizers',
        },
        key: 'id',
      },
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
    modelName: 'ReportTrainingEvent',
  });
  return ReportTrainingEvent;
};
