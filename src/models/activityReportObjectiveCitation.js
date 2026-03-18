const { Model } = require('sequelize');

/**
   * Flattened per-reference citation rows for an Activity Report Objective.
   * @param {} sequelize
   * @param {*} DataTypes
   */
export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveCitation extends Model {
    static associate(models) {
      ActivityReportObjectiveCitation.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      });
      ActivityReportObjectiveCitation.belongsTo(models.Citation, {
        foreignKey: 'citationId',
        onDelete: 'set null',
        as: 'citationModel',
      });
    }
  }
  ActivityReportObjectiveCitation.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    activityReportObjectiveId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    citationId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Citations',
        key: 'id',
      },
    },
    citation: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    /*
      The monitoringReferences field is a legacy field that linked to monitoring data, which
      has since been normalized into fact tables and normalized here to individual fields.
      This field is retained for historical refernce.
    */
    monitoringReferences: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    grantNumber: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    findingId: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reviewName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    standardId: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    findingType: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    findingSource: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    acro: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    severity: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    reportDeliveryDate: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    monitoringFindingStatusName: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },

  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveCitation',
  });
  return ActivityReportObjectiveCitation;
};
