const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ObjectiveFile extends Model {
    static associate(models) {
      ObjectiveFile.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective' });
      ObjectiveFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
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
    },
    fileId: {
      type: DataTypes.INTEGER,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveFile',
  });
  return ObjectiveFile;
};
