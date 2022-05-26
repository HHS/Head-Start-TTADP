const { Model } = require('sequelize');

const generateFullName = (user, collaboratorRoles, substituteUserRoles = false) => {
  const roles = collaboratorRoles.map((r) => r.role).sort();

  if (!roles.length && substituteUserRoles) {
    return user.fullName;
  }

  const combinedRoles = roles.reduce((result, val) => {
    if (val) {
      return val === 'TTAC' || val === 'COR' ? `${result}, ${val}` : `${result}, ${val.split(' ').map((word) => word[0]).join('')}`;
    }
    return '';
  }, []);
  return combinedRoles.length > 0 ? `${user.name}${combinedRoles}` : user.name;
};

module.exports = (sequelize, DataTypes) => {
  class ActivityReportCollaborator extends Model {
    static associate(models) {
      ActivityReportCollaborator.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportCollaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      ActivityReportCollaborator.hasMany(models.CollaboratorRole, { foreignKey: 'activityReportCollaboratorId', onDelete: 'cascade', as: 'collaboratorRoles' });
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
        return this.collaboratorRoles
          ? generateFullName(this.user, this.collaboratorRoles)
          : this.user.name;
      },
    },
    fullNameSubstituteRoles: {
      type: DataTypes.VIRTUAL,
      get() {
        // If the report was created before we saved collaborator roles.
        // We can use this field to ensure roles showed as they did before.
        // Otherwise it will pull from the 'CollaboratorRoles' table.
        return generateFullName(this.user, this.collaboratorRoles, true);
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
