const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
} = require('../constants');

export default (sequelize, DataTypes) => {
  class SessionReport extends Model {
    static associate(models) {
      SessionReport.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      SessionReport.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .hasOne(models.SessionReport, {
          foreignKey: 'reportId',
          as: 'session',
        });
      models.Region.hasMany(models.SessionReport, {
        foreignKey: 'regionId',
        as: 'session',
      });
    }
  }
  SessionReport.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
    },
    reportId: {
      type: DataTypes.BIGINT,
      allowNull: false,
    },
    eventReportId: {
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
    inpersonParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    virtualParticipants: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'SessionReport',
  });
  return SessionReport;
};
