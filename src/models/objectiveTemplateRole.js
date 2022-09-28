const { Model } = require('sequelize');
// const { auditLogger } = require('../logger');

/**
   * ObjectiveRole table. Junction table
   * between Objectives and roles
   * @param {} sequelize
   * @param {*} DataTypes
   */
module.exports = (sequelize, DataTypes) => {
  class ObjectiveTemplateRole extends Model {
    static associate(models) {
      ObjectiveTemplateRole.belongsTo(models.ObjectiveTemplate, {
        foreignKey: 'objectiveTemplateId',
        onDelete: 'cascade',
        as: 'objectiveTemplate',
        hooks: true,
      });
      ObjectiveTemplateRole.belongsTo(models.Role, {
        foreignKey: 'roleId',
        onDelete: 'cascade',
        as: 'role',
        hooks: true,
      });
    }
  }
  ObjectiveTemplateRole.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveTemplateId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    roleId: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateRole',
  });
  return ObjectiveTemplateRole;
};
