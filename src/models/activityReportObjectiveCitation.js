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
      allowNull: false,
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
      allowNull: false,
    },
    findingId: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reviewName: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    standardId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    findingType: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    findingSource: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    acro: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    severity: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    reportDeliveryDate: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    monitoringFindingStatusName: {
      type: DataTypes.TEXT,
      allowNull: false,
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
