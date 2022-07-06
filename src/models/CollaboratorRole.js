const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
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
    role: {
      allowNull: false,
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'CollaboratorRole',
  });
  return CollaboratorRole;
};
