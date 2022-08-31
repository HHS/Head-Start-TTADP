const { Op, Model } = require('sequelize');
const { COLLABORATOR_TYPES, ENTITY_TYPES } = require('../constants');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportGoal extends Model {
    static associate(models) {
      ActivityReportGoal.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportGoal.belongsTo(models.Goal, { foreignKey: 'goalId', as: 'goal' });
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
      ActivityReportGoal.hasMany(models.Collaborator, {
        scope: {
          entityType: ENTITY_TYPES.REPORTGOAL,
          collaboratorTypes: { [Op.contains]: [COLLABORATOR_TYPES.OWNER] },
        },
        foreignKey: 'entityId',
        as: 'owners',
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
  }, {
    sequelize,
    modelName: 'ActivityReportGoal',
  });
  return ActivityReportGoal;
};
