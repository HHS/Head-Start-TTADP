const {
  Model,
} = require('sequelize');

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
      allowNull: false,
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
