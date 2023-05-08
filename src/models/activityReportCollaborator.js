const { Model } = require('sequelize');
const generateFullName = require('./helpers/generateFullName');

export default (sequelize, DataTypes) => {
  class ActivityReportCollaborator extends Model {
    static associate(models) {
      ActivityReportCollaborator.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportCollaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      ActivityReportCollaborator.hasMany(models.CollaboratorRole, { foreignKey: 'activityReportCollaboratorId', as: 'collaboratorRoles' });
      ActivityReportCollaborator.belongsToMany(models.Role, {
        through: models.CollaboratorRole,
        foreignKey: 'activityReportCollaboratorId',
        otherKey: 'roleId',
        as: 'roles',
      });
    }
  }
  ActivityReportCollaborator.init({
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    userId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    fullName: {
      type: DataTypes.VIRTUAL,
      get() {
        const roles = this.roles && this.roles.length
          ? this.roles : this.user.roles;
        return generateFullName(this.user.name, roles);
      },
    },
  }, {
    sequelize,
    modelName: 'ActivityReportCollaborator',
    indexes: [
      {
        unique: true,
        fields: ['userId', 'activityReportId'],
      },
    ],
  });
  return ActivityReportCollaborator;
};

export {
  // eslint-disable-next-line
  generateFullName,
};
