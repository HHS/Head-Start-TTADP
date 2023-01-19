const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
      Group.hasMany(models.GroupUser, { foreignKey: 'groupId', as: 'groupUsers' });
      Group.belongsToMany(models.User, {
        through: models.GroupUser,
        foreignKey: 'groupId',
        otherKey: 'userId',
        as: 'users',
      });
      Group.hasMany(models.GroupGrant, { foreignKey: 'groupId', as: 'groupGroups' });
      Group.belongsToMany(models.User, {
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
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Group',
    timestamps: false,
  });
  return Group;
};
