const { Model } = require('sequelize');
const {
  afterCreate,
  afterUpdate,
  beforeCreate,
  beforeUpdate,
  beforeDestroy,
} = require('./hooks/sessionReportPilot');

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
      // Approver.
      SessionReportPilot.belongsTo(models.User, { foreignKey: 'approverId', as: 'approver' });
      // Submitter
      SessionReportPilot.belongsTo(models.User, { foreignKey: 'submitterId', as: 'submitter' });
      // Trainers.
      SessionReportPilot.hasMany(models.SessionReportPilotTrainer, { foreignKey: 'sessionReportPilotId', as: 'sessionTrainers' });
      SessionReportPilot.belongsToMany(models.User, {
        through: models.SessionReportPilotTrainer,
        foreignKey: 'sessionReportPilotId',
        otherKey: 'userId',
        as: 'trainers',
      });
      // Grants.
      SessionReportPilot.hasMany(models.SessionReportPilotGrant, { foreignKey: 'sessionReportPilotId', as: 'sessionGrants' });
      SessionReportPilot.belongsToMany(models.Grant, {
        through: models.SessionReportPilotGrant,
        foreignKey: 'sessionReportPilotId',
        otherKey: 'grantId',
        as: 'grants',
      });
      // Goal Templates.
      SessionReportPilot.hasMany(models.SessionReportPilotGoalTemplate, { foreignKey: 'sessionReportPilotId', as: 'sessionGoalTemplates' });
      SessionReportPilot.belongsToMany(models.GoalTemplate, {
        through: models.SessionReportPilotGoalTemplate,
        foreignKey: 'sessionReportPilotId',
        otherKey: 'goalTemplateId',
        as: 'goalTemplates',
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
    approverId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    submitterId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
    submitted: {
      type: DataTypes.VIRTUAL,
      get() {
        return !!(
          this.approverId
          && this.data
          && this.data.pocComplete
          && this.data.collabComplete
        );
      },
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
