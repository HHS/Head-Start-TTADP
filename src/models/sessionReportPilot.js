const { Model } = require('sequelize');
const {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
} = require('../hooks/sessionReportPilot');

export default (sequelize, DataTypes) => {
  class SessionReportPilot extends Model {
    static associate(models) {
      SessionReportPilot.belongsTo(models.EventReportPilot, { foreignKey: 'eventId', as: 'event' });
      SessionReportPilot.hasMany(models.SessionReportPilotFile, { foreignKey: 'sessionReportPilotId', as: 'sessionFiles' });
      // Files.
      SessionReportPilot.belongsToMany(models.File, {
        through: models.SessionReportPilotFile,
        foreignKey: 'sessionReportPilotId',
        otherKey: 'fileId',
        as: 'files',
      });
      // Supporting attachments.
      SessionReportPilot.hasMany(models.SessionReportPilotSupportingAttachment, { foreignKey: 'sessionReportPilotId', as: 'sessionSupportingAttachments' });
      SessionReportPilot.belongsToMany(models.File, {
        through: models.SessionReportPilotSupportingAttachment,
        foreignKey: 'sessionReportPilotId',
        otherKey: 'fileId',
        as: 'supportingAttachments',
      });
    }
  }

  SessionReportPilot.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    eventId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'SessionReportPilot',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    },
  });

  return SessionReportPilot;
};
