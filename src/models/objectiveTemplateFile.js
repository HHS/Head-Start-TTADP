const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
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
    },
    fileId: {
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateFile',
  });
  return ObjectiveTemplateFile;
};
