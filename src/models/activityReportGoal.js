const { Op, Model } = require('sequelize');
const { COLLABORATOR_TYPES, ENTITY_TYPES, CLOSE_SUSPEND_REASONS } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportGoal extends Model {
    static associate(models) {
      ActivityReportGoal.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport', hooks: true });
      ActivityReportGoal.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal', hooks: true });
      ActivityReportGoal.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.RATIFIER] },
        },
        foreignKey: 'entityId',
        as: 'approvers',
        hooks: true,
      });
      ActivityReportGoal.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.EDITOR] },
        },
        foreignKey: 'entityId',
        as: 'collaborators',
        hooks: true,
      });
      ActivityReportGoal.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.OWNER] },
        },
        foreignKey: 'entityId',
        as: 'owner',
        hooks: true,
      });
      ActivityReportGoal.hasOne(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.INSTANTIATOR] },
        },
        foreignKey: 'entityId',
        as: 'instantiator',
        hooks: true,
      });
      ActivityReportGoal.hasMany(models.Approval, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
        },
        foreignKey: 'entityId',
        as: 'approvals',
        hooks: true,
      });
    }
  }
  ActivityReportGoal.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.STRING,
    closeSuspendReason: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(CLOSE_SUSPEND_REASONS).map((k) => CLOSE_SUSPEND_REASONS[k])),
    },
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
    closeSuspendContext: {
      type: DataTypes.TEXT,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportGoal',
  });
  return ActivityReportGoal;
};
