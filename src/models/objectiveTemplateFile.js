const { Model } = require('sequelize');
const { afterCreate, beforeDestroy, afterDestroy } = require('./hooks/objectiveTemplateFile');
// const { auditLogger } = require('../logger');

export default (sequelize, DataTypes) => {
  class ObjectiveTemplateFile extends Model {
    static associate(models) {
      ObjectiveTemplateFile.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', as: 'objectiveTemplate', hooks: true });
      ObjectiveTemplateFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file', hooks: true });
    }
  }
  ObjectiveTemplateFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateFile',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ObjectiveTemplateFile;
};
