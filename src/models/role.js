const { Model } = require('sequelize')

/**
 * Roles table. Stores user roles, e.g. 'HS' ('Health Specialist')
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */

export default (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.hasMany(models.RoleTopic, { foreignKey: 'roleId', as: 'roleTopics' })
      Role.belongsToMany(models.Topic, {
        through: models.RoleTopic,
        foreignKey: 'roleId',
        as: 'topics',
        otherKey: 'topicId',
      })
      Role.hasMany(models.UserRole, { foreignKey: 'roleId', as: 'userRoles' })
      Role.belongsToMany(models.User, {
        through: models.UserRole,
        foreignKey: 'roleId',
        otherKey: 'userId',
        as: 'users',
      })
      Role.hasMany(models.CollaboratorRole, { foreignKey: 'roleId', as: 'collaboratorRoles' })
      Role.belongsToMany(models.ActivityReportCollaborator, {
        through: models.CollaboratorRole,
        otherKey: 'activityReportCollaboratorId',
        foreignKey: 'roleId',
        as: 'collaborators',
      })
    }
  }
  Role.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      fullName: {
        type: DataTypes.STRING,
      },
      isSpecialist: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        default: false,
        onUpdate: 'CASCADE',
      },
      deletedAt: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      mapsTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Role',
    }
  )
  return Role
}
