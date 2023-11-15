const {
  Model,
} = require('sequelize');

export default (sequelize, DataTypes) => {
  class ImportDataFile extends Model {
    static associate(models) {
      models.ImportDataFile.belongsTo(models.ImportFile, { foreignKey: 'importFileId', as: 'importFile' });
      models.ImportFile.hasMany(models.ImportDataFile, { foreignKey: 'importFileId', as: 'importDataFiles' });
    }
  }
  ImportDataFile.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    importFileId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ImportFiles',
        },
        key: 'id',
      },
    },
    zipFileInfo: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    hash: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    processed: {
      type: DataTypes.BOOLEAN,
      allowNull: true,
    },
    schema: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    recordCounts: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'ImportDataFile',
  });
  return ImportDataFile;
};
