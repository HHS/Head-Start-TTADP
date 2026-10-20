import { Model } from 'sequelize';

// Per-entity observations captured during a validation run. Each row records
// one observation (scalar or categorical) about one entity (entity_type/entity_id),
// e.g. the number of findings on a review, or a categorization of a finding's state.
// context is optional generic JSONB for auxiliary data about the same
// observation (e.g. the date an observation's value was learned) that doesn't
// warrant its own observation_name row - mirrors ValidationAlerts.context.
// Validations compare observations to expectations and raise ValidationAlerts.
export default (sequelize, DataTypes) => {
  class ValidationRecord extends Model {
    // Validation tables are high churn, purely operational tables
    static noAudit = true;

    static associate(models) {
      models.ValidationRecord.belongsTo(models.ValidationRun, {
        foreignKey: 'run_id',
        as: 'run',
      });
    }
  }
  ValidationRecord.init(
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
      entity_type: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      entity_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      observation_name: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      scalar: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      category: {
        type: DataTypes.TEXT,
        allowNull: true,
      },
      context: {
        type: DataTypes.JSONB,
        allowNull: true,
      },
    },
    {
      sequelize,
      modelName: 'ValidationRecord',
      tableName: 'ValidationRecords',
    }
  );
  return ValidationRecord;
};
