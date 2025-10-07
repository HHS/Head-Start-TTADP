const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class SessionReportPilotGrant extends Model {
    static associate(models) {
      SessionReportPilotGrant.belongsTo(models.SessionReportPilot, {
        foreignKey: 'sessionReportPilotId',
        as: 'sessionReportPilot',
      });
      SessionReportPilotGrant.belongsTo(models.Grant, {
        foreignKey: 'grantId',
        as: 'grant',
      });
    }
  }

  SessionReportPilotGrant.init({
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
    grantId: {
      allowNull: false,
      type: DataTypes.INTEGER,
      references: {
        model: 'Grants',
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'SessionReportPilotGrant',
    tableName: 'SessionReportPilotGrants',
    paranoid: true,
    timestamps: true,
    indexes: [
      {
        name: 'session_report_pilot_grants_unique',
        unique: true,
        fields: ['sessionReportPilotId', 'grantId'],
      },
    ],
  });

  return SessionReportPilotGrant;
};
