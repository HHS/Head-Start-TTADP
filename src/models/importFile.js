const {
  Model,
} = require('sequelize');
const { IMPORT_STATUSES } = require('../constants');

export default (sequelize, DataTypes) => {
  class ImportFile extends Model {
    static associate(models) {
      models.ImportFile.belongsTo(models.Import, { foreignKey: 'importId', as: 'import' });
      models.Import.hasMany(models.ImportFile, { foreignKey: 'importId', as: 'importFiles' });
      models.ImportFile.belongsTo(models.File, { foreignKey: 'importId', as: 'file' });
      models.File.hasOne(models.ImportFile, { foreignKey: 'importId', as: 'importFile' });
    }
  }
  ImportFile.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    importId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Imports',
        },
        key: 'id',
      },
    },
    fileId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Files',
        },
        key: 'id',
      },
    },
    ftpFileInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    status: {
      type: DataTypes.ENUM(Object.values(IMPORT_STATUSES)),
      allowNull: false,
      defaultValue: IMPORT_STATUSES.IDENTIFIED,
    },
    downloadAttempts: {
      type: DataTypes.INT,
      allowNull: false,
      defaultValue: 0,
    },
    processAttempts: {
      type: DataTypes.INT,
      allowNull: false,
      defaultValue: 0,
    },
    hash: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ImportFile',
  });
  return ImportFile;
};
