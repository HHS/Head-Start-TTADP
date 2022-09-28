const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CollaboratorRole extends Model {
    static associate(models) {
      CollaboratorRole.belongsTo(models.Collaborator, { foreignKey: 'collaboratorId', as: 'collaborator', hooks: true });
      CollaboratorRole.belongsTo(models.Role, { foreignKey: 'roleId', as: 'role', hooks: true });
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
      allowNull: false,
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'CollaboratorRole',
  });
  return CollaboratorRole;
};
