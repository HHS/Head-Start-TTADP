const {
  Model,
  Op,
} = require('sequelize');
const {
  ENTITY_TYPE,
} = require('../constants');

export default (sequelize, DataTypes) => {
  class ReportTrainingSession extends Model {
    static associate(models) {
      ReportTrainingSession.belongsTo(models.Report, {
        foreignKey: 'reportId',
        as: 'report',
      });
      ReportTrainingSession.belongsTo(models.Region, {
        foreignKey: 'regionId',
        as: 'region',
      });

      models.Report.scope(ENTITY_TYPE.REPORT_SESSION)
        .hasOne(models.ReportTrainingSession, {
          foreignKey: 'reportId',
          as: 'session',
        });
      models.Region.hasMany(models.ReportTrainingSession, {
        foreignKey: 'regionId',
        as: 'session',
      });
    }
  }
  ReportTrainingSession.init({
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
    deliveryMethod: {
      type: new DataTypes.VIRTUAL(DataTypes.STRING, ['inpersonParticipants', 'virtualParticipants']),
      get() {
        const inperson = this.get('inpersonParticipants');
        const virtual = this.get('virtualParticipants');

        switch (true) {
          case inperson && virtual:
            return 'hybrid';
          case inperson:
            return 'in-person';
          case virtual:
            return 'virtual';
          default:
            return null;
        }
      },
    },
  }, {
    sequelize,
    modelName: 'ReportTrainingSession',
  });
  return ReportTrainingSession;
};
