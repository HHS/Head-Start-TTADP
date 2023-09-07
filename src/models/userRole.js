const {
  Model,
} = require('sequelize');

/**
   * RolesTopic table. Junction table between Roles and Topics to support many to many relationship.
   *
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class UserRole extends Model {
    static associate(models) {
      UserRole.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'cascade', as: 'user' });
      UserRole.belongsTo(models.Role, { foreignKey: 'roleId', onDelete: 'cascade', as: 'role' });
    }
  }
  UserRole.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: { tableName: 'Users' }, key: 'id' },
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
      references: { model: { tableName: 'Roles' }, key: 'id' },
    },
  }, {
    sequelize,
    modelName: 'UserRole',
  });
  return UserRole;
};
