const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class SessionReportPilotTrainer extends Model {
    static associate(models) {
      SessionReportPilotTrainer.belongsTo(models.SessionReportPilot, {
        foreignKey: 'sessionReportPilotId',
        as: 'sessionReportPilot',
      });
      SessionReportPilotTrainer.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'trainer',
      });
    }
  }

  SessionReportPilotTrainer.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    sessionReportPilotId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'SessionReportPilots',
        key: 'id',
      },
    },
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'Users',
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'SessionReportPilotTrainer',
    tableName: 'SessionReportPilotTrainers',
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        name: 'session_report_pilot_trainers_unique',
        unique: true,
        fields: ['sessionReportPilotId', 'userId'],
      },
    ],
  });

  return SessionReportPilotTrainer;
};
