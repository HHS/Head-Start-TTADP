const { Model } = require('sequelize');
const { afterDestroy } = require('./hooks/objectiveTemplateFile');

export default (sequelize, DataTypes) => {
  class ObjectiveTemplateFile extends Model {
    static associate(models) {
      ObjectiveTemplateFile.belongsTo(models.ObjectiveTemplate, { foreignKey: 'objectiveTemplateId', as: 'objectiveTemplate' });
      ObjectiveTemplateFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
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
    isFoiaable: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateFile',
    hooks: {
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ObjectiveTemplateFile;
};
