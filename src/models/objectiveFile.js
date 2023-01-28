const { Model } = require('sequelize');
const { afterCreate, beforeDestroy, afterDestroy } = require('./hooks/objectiveFile');

export default (sequelize, DataTypes) => {
  class ObjectiveFile extends Model {
    static associate(models) {
      ObjectiveFile.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective', hooks: true });
      ObjectiveFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file', hooks: true });
    }
  }
  ObjectiveFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveFile',
    hooks: {
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ObjectiveFile;
};
