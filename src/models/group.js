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
      type: DataTypes.STRING,
      allowNull: false,
    },
    userId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Group',
    // timestamps: false,
  });
  return Group;
};
