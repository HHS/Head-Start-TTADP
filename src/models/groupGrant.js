const {
  Model,
} = require('sequelize');

/**
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class GroupGrant extends Model {
    static associate(models) {
      GroupGrant.belongsTo(models.Grant, { foreignKey: 'grantId', onDelete: 'cascade', as: 'grant' });
      GroupGrant.belongsTo(models.Group, { foreignKey: 'groupId', onDelete: 'cascade', as: 'group' });
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
