const { Model } = require('sequelize');

const generateFullName = (user, collaboratorRoles) => {
  if (!collaboratorRoles.length) {
    return user.fullName; // Contains name and roles from user.
  }
  const roles = collaboratorRoles.map((r) => r.role).sort();
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
        return generateFullName(this.user, this.collaboratorRoles);
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
