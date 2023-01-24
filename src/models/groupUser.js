const {
  Model,
} = require('sequelize');

/**
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default  (sequelize, DataTypes) => {
  class GroupUser extends Model {
    static associate(models) {
      GroupUser.belongsTo(models.User, { foreignKey: 'userId', onDelete: 'cascade', as: 'user' });
      GroupUser.belongsTo(models.Group, { foreignKey: 'roleId', onDelete: 'cascade', as: 'role' });
    }
  }
  GroupUser.init({
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    groupId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'GroupUser',
  });
  return GroupUser;
};
