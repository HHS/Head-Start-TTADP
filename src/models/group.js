const {
  Model,
} = require('sequelize');
const {
  afterCreate,
} = require('./hooks/group');

export default (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
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
    isPublic: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  }, {
    sequelize,
    modelName: 'Group',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
    },
  });
  return Group;
};
