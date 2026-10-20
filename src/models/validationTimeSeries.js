import { Model } from 'sequelize';

// Long/narrow time-series aggregated statistics describing imported data activity,
// progressively upserted by validation runs. region_id/geo_id use 0 as a
// "not applicable/unknown" sentinel because they participate in the upsert key.
export default (sequelize, DataTypes) => {
  class ValidationTimeSeries extends Model {
    // Validation tables are high churn, purely operational tables
    static noAudit = true;

    static associate() {}
  }
  ValidationTimeSeries.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      feature_set: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      period_type: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      period_start: {
        type: DataTypes.DATEONLY,
        allowNull: false,
      },
      region_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      geo_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      stat_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      value: {
        type: DataTypes.DECIMAL,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'ValidationTimeSeries',
      tableName: 'ValidationTimeSeries',
    }
  );
  return ValidationTimeSeries;
};
