const {
  Model,
} = require('sequelize');

/**
   * ObjectiveRole table. Junction table
   * between Objectives and roles
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ObjectiveRole extends Model {
    static associate(models) {
      ObjectiveRole.belongsTo(models.Objective, { foreignKey: 'objectiveId', onDelete: 'cascade', as: 'objective' });
      ObjectiveRole.belongsTo(models.Role, { foreignKey: 'roleId', onDelete: 'cascade', as: 'role' });
    }
  }
  ObjectiveRole.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveRole',
  });
  return ObjectiveRole;
};
