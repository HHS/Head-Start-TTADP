import { Model } from 'sequelize';

// One row per validation run of a given process (e.g. 'monitoring').
// Populated by src/tools/validateMonitoringData.ts.
export default (sequelize, DataTypes) => {
  class ValidationRun extends Model {
    // Validation tables are high churn, purely operational tables
    static noAudit = true;

    static associate(models) {
      models.ValidationRun.hasMany(models.ValidationRecord, {
        foreignKey: 'run_id',
        as: 'records',
      });
      models.ValidationRun.hasMany(models.ValidationAlert, {
        foreignKey: 'run_id',
        as: 'alerts',
      });
    }
  }
  ValidationRun.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      process_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      status: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      started_at: {
        type: DataTypes.DATE,
        allowNull: false,
      },
      // Soft reference to the import this run validated (ImportFiles.id); null when
      // not tied to an import. Non-unique - runs of one cycle share a value.
      import_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      // The import's source data date (ImportFiles.ftpFileInfo.date, the value the
      // import writes to the raw rows' sourceUpdatedAt).
      source_updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      completed_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      stats_upserted: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      observation_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      alert_count: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ValidationRun',
      tableName: 'ValidationRuns',
    }
  );
  return ValidationRun;
};
