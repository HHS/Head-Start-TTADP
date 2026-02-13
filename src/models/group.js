const { Model } = require('sequelize')
const { GROUP_SHARED_WITH } = require('@ttahub/common')
const { afterCreate, afterUpdate } = require('./hooks/group')

export default (sequelize, DataTypes) => {
  class Group extends Model {
    static associate(models) {
      Group.hasMany(models.GroupGrant, { foreignKey: 'groupId', as: 'groupGrants' })
      Group.belongsToMany(models.Grant, {
        through: models.GroupGrant,
        foreignKey: 'groupId',
        otherKey: 'grantId',
        as: 'grants',
      })
    }
  }
  Group.init(
    {
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
      sharedWith: {
        type: DataTypes.ENUM(Object.values(GROUP_SHARED_WITH)),
      },
    },
    {
      sequelize,
      modelName: 'Group',
      hooks: {
        afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
        afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      },
    }
  )
  return Group
}
