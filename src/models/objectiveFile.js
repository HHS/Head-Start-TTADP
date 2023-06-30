const { Model } = require('sequelize');
const {
  beforeValidate,
  afterCreate,
  beforeDestroy,
  afterDestroy,
} = require('./hooks/objectiveFile');

export default (sequelize, DataTypes) => {
  class ObjectiveFile extends Model {
    static associate(models) {
      ObjectiveFile.belongsTo(models.Objective, { foreignKey: 'objectiveId', onDelete: 'cascade', as: 'objective' });
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
      allowNull: false,
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    onAR: {
      type: DataTypes.BOOLEAN,
      default: false,
      allowNull: false,
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
      default: false,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ObjectiveFile',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      afterCreate: async (instance, options) => afterCreate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
  });
  return ObjectiveFile;
};
