const {
  Model,
  Op,
} = require('sequelize');
const {
  REPORT_TYPE,
} = require('../constants');
const {
  afterCreate,
} = require('./hooks/reportTrainingSession');

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

      models.Report.scope({ method: ['reportType', REPORT_TYPE.REPORT_TRAINING_SESSION] })
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
      allowNull: false,
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
    reportTrainingEventId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportTrainingEvents',
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
    // TODO - move to correct table
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
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    },
    sequelize,
    modelName: 'ReportTrainingSession',
  });
  return ReportTrainingSession;
};
