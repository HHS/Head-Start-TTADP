const {
  Model,
} = require('sequelize');

export default (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
      Group.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      Group.hasMany(models.GroupGrant, { foreignKey: 'groupId', as: 'groupGrants' });
      Group.belongsToMany(models.Grant, {
        through: models.GroupGrant,
        foreignKey: 'groupId',
        otherKey: 'grantId',
        as: 'grants',
      });
    }
  }
  Group.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    isPublic: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  }, {
    sequelize,
    modelName: 'Group',
  });
  return Group;
};
