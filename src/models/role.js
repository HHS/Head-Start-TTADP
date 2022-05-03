const {
  Model,
} = require('sequelize');

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
        through: models.RoleTopic, foreignKey: 'roleId', as: 'topics',
      });
      Role.belongsToMany(models.Objective, { through: models.ObjectiveRole, foreignKey: 'roleId', as: 'objectives' });
      Role.belongsToMany(models.ObjectiveTemplate, { through: models.ObjectiveTemplateRole, foreignKey: 'roleId', as: 'objectiveTemplates' });
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
  }, {
    sequelize,
    modelName: 'Role',
  });
  return Role;
};
