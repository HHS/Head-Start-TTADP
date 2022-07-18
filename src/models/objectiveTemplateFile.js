const { Model } = require('sequelize');
// const { auditLogger } = require('../logger');

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
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplateFile',
  });
  return ObjectiveTemplateFile;
};
