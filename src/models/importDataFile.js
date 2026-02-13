import { Model } from 'sequelize'
import { IMPORT_DATA_STATUSES } from '../constants'

export default (sequelize, DataTypes) => {
  class ImportDataFile extends Model {
    static associate(models) {
      models.ImportDataFile.belongsTo(models.ImportFile, {
        foreignKey: 'importFileId',
        as: 'importFile',
      })
      models.ImportFile.hasMany(models.ImportDataFile, {
        foreignKey: 'importFileId',
        as: 'importDataFiles',
      })
    }
  }
  ImportDataFile.init(
    {
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
      fileInfo: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      hash: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      status: {
        type: DataTypes.ENUM(Object.values(IMPORT_DATA_STATUSES)),
        allowNull: false,
        defaultValue: sequelize.literal(`'${IMPORT_DATA_STATUSES.IDENTIFIED}'::"enum_ImportDataFiles_status"`),
      },
      schema: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
      recordCounts: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ImportDataFile',
    }
  )
  return ImportDataFile
}
