import { Model } from 'sequelize';

// Alerts raised by validations over ValidationTimeSeries and ValidationRecords.
// context is intentionally generic JSONB so different checks can attach whatever
// contextual information applies (previous values, entity id samples, etc.).
export default (sequelize, DataTypes) => {
  class ValidationAlert extends Model {
    // Validation tables are high churn, purely operational tables
    static noAudit = true;

    static associate(models) {
      models.ValidationAlert.belongsTo(models.ValidationRun, {
        foreignKey: 'run_id',
        as: 'run',
      });
    }
  }
  ValidationAlert.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        primaryKey: true,
        autoIncrement: true,
      },
      run_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      check_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      message: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      // 'alert' | 'critical'; see VALIDATION_ALERT_SEVERITY in src/constants.js.
      severity: {
        type: DataTypes.TEXT,
        allowNull: false,
        defaultValue: 'alert',
      },
      context: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ValidationAlert',
      tableName: 'ValidationAlerts',
    }
  );
  return ValidationAlert;
};
