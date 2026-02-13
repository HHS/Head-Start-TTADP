const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class Import extends Model {
    static associate(models) {}
  }
  Import.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      ftpSettings: {
        allowNull: false,
        type: DataTypes.JSONB,
      },
      path: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
      fileMask: {
        allowNull: true,
        type: DataTypes.TEXT,
      },
      schedule: {
        allowNull: false,
        type: DataTypes.TEXT,
      },
      enabled: {
        allowNull: false,
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      definitions: {
        type: DataTypes.JSONB,
        allowNull: false,
      },
      postProcessingActions: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'Import',
    }
  )
  return Import
}
