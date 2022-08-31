const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CollaboratorRole extends Model {
    static associate(models) {
      CollaboratorRole.belongsTo(models.Collaborator, { foreignKey: 'collaboratorId', as: 'collaborator' });
      CollaboratorRole.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role' });
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
    collaboratorId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    roleId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'CollaboratorRole',
  });
  return CollaboratorRole;
};
