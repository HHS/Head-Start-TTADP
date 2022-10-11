const {
  Model,
} = require('sequelize');
const beforeDestroy = require('./hooks/role');

/**
 * Roles table. Stores user roles, e.g. 'HS' ('Health Specialist')
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */

module.exports = (sequelize, DataTypes) => {
  class Role extends Model {
    static associate(models) {
      Role.belongsToMany(models.Topic, {
        through: models.RoleTopic, foreignKey: 'roleId', as: 'topics', otherKey: 'topicId', hooks: true,
      });
      Role.belongsToMany(models.Objective, {
        through: models.ObjectiveRole,
        foreignKey: 'roleId',
        otherKey: 'objectiveId',
        as: 'objectives',
        hooks: true,
      });
      Role.belongsToMany(models.ObjectiveTemplate, {
        through: models.ObjectiveTemplateRole,
        foreignKey: 'roleId',
        otherKey: 'objectiveTemplateId',
        as: 'objectiveTemplates',
        hooks: true,
      });
      Role.belongsToMany(models.User, {
        through: models.UserRole,
        foreignKey: 'roleId',
        otherKey: 'userId',
        as: 'users',
        hooks: true,
      });
      Role.belongsToMany(models.Collaborator, {
        through: models.CollaboratorRole,
        otherKey: 'collaboratorId',
        foreignKey: 'roleId',
        as: 'collaboratorRoles',
        hooks: true,
      });
    }
  }
  Role.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
  }, {
    hooks: {
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    },
    sequelize,
    modelName: 'Role',
  });
  return Role;
};
