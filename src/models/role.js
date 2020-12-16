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
    }
  }
  Role.init({
    id: {
      type: DataTypes.INTEGER,
      // allowNull: false,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'Role',
  });
  return Role;
};
