const { Model } = require('sequelize');
const {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
} = require('./hooks/sessionReport');

export default (sequelize, DataTypes) => {
  class SessionReport extends Model {
    static associate(models) {
      SessionReport.belongsTo(models.TrainingReport, { foreignKey: 'eventId', as: 'event' });
      SessionReport.hasMany(models.SessionReportFile, { foreignKey: 'sessionReportId', as: 'sessionFiles' });
      // Files.
      SessionReport.belongsToMany(models.File, {
        through: models.SessionReportFile,
        foreignKey: 'sessionReportId',
        otherKey: 'fileId',
        as: 'files',
      });
      // Supporting attachments.
      SessionReport.hasMany(models.SessionReportSupportingAttachment, { foreignKey: 'sessionReportId', as: 'sessionSupportingAttachments' });
      SessionReport.belongsToMany(models.File, {
        through: models.SessionReportSupportingAttachment,
        foreignKey: 'sessionReportId',
        otherKey: 'fileId',
        as: 'supportingAttachments',
      });
    }
  }

  SessionReport.init({
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
    modelName: 'SessionReport',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      beforeCreate: async (instance, options) => beforeCreate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    },
  });

  return SessionReport;
};
