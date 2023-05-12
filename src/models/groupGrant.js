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
      GroupGrant.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      GroupGrant.belongsTo(models.Group, { foreignKey: 'groupId', as: 'group' });
    }
  }
  GroupGrant.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
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
