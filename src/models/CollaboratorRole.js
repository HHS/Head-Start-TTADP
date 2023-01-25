const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CollaboratorRole extends Model {
    static associate(models) {
      CollaboratorRole.belongsTo(models.ActivityReportCollaborator, { foreignKey: 'activityReportCollaboratorId', as: 'activityReportCollaborator' });
    }
  }
  CollaboratorRole.init({
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
    modelName: 'CollaboratorRole',
  });
  return CollaboratorRole;
};
