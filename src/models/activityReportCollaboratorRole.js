const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ActivityReportCollaboratorRole extends Model {
    static associate(models) {
      ActivityReportCollaboratorRole.belongsTo(models.ActivityReportCollaborator, {
        foreignKey: 'activityReportCollaboratorId',
        as: 'collaborator',
        hooks: true,
      });
      ActivityReportCollaboratorRole.belongsTo(models.Role, {
        foreignKey: 'roleId',
        as: 'role',
        hooks: true,
      });
    }
  }
  ActivityReportCollaboratorRole.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      autoIncrement: true,
    },
    activityReportCollaboratorId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    roleId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportCollaboratorRole',
  });
  return ActivityReportCollaboratorRole;
};
