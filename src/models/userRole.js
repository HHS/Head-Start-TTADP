const {
  Model,
} = require('sequelize');

/**
   * RolesTopic table. Junction table between Roles and Topics to support many to many relationship.
   *
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class UserRole extends Model {
    static associate(models) {
      UserRole.belongsTo(models.User, {
        foreignKey: 'userId',
        onDelete: 'cascade',
        as: 'user',
        hooks: true,
      });
      UserRole.belongsTo(models.Role, {
        foreignKey: 'roleId',
        onDelete: 'cascade',
        as: 'role',
        hooks: true,
      });
    }
  }
  UserRole.init({
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'UserRole',
  });
  return UserRole;
};
