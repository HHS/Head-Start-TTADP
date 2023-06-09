const { Model } = require('sequelize');
const {
  beforeValidate,
  afterCreate,
  beforeDestroy,
  afterDestroy,
} = require('./hooks/dbMaintenanceFile');
const { DB_MAINTENANCE_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class DBMaintenanceFile extends Model {
    static associate(models) {
      DBMaintenanceFile.belongsTo(models.File, { foreignKey: 'fileId', as: 'file' });
      models.File.hasOne(models.DBMaintenanceFile, { foreignKey: 'fileId', as: 'file' });
    }
  }
  DBMaintenanceFile.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    type: {
      type: DataTypes.ENUM(Object.values(DB_MAINTENANCE_TYPE)),
    },
    fileId: {
      type: DataTypes.INTEGER,
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
  return DBMaintenanceFile;
};
