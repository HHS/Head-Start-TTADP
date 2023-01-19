const {
  Model,
} = require('sequelize');

/**
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class GroupGrant extends Model {
    static associate(models) {
      GroupGrant.belongsTo(models.Grant, { foreignKey: 'grantId', onDelete: 'cascade', as: 'grant' });
      GroupGrant.belongsTo(models.Group, { foreignKey: 'roleId', onDelete: 'cascade', as: 'role' });
    }
  }
  GroupGrant.init({
    grantId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    groupId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'GroupGrant',
  });
  return GroupGrant;
};
