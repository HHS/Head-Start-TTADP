import { Model } from 'sequelize';

// One row per validation run of a given process (e.g. 'monitoring').
// Populated by src/tools/validateMonitoringData.ts.
export default (sequelize, DataTypes) => {
  class ValidationRun extends Model {
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
        type: DataTypes.BIGINT,
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
