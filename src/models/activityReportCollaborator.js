const { Model } = require('sequelize');
const generateFullName = require('./helpers/generateFullName');

module.exports = (sequelize, DataTypes) => {
  class ActivityReportCollaborator extends Model {
    static associate(models) {
      ActivityReportCollaborator.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId', as: 'activityReport' });
      ActivityReportCollaborator.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      ActivityReportCollaborator.belongsToMany(models.Role, {
        through: models.CollaboratorRole,
        foreignKey: 'activityReportCollaboratorId',
        otherKey: 'roleId',
        as: 'collaboratorRoles',
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
        return generateFullName(this.user.name, this.collaboratorRoles);
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
