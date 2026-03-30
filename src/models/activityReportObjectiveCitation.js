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
        onDelete: 'cascade',
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
      allowNull: true,
    },
    acro: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    name: {
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
    monitoringReferences: {
      type: DataTypes.VIRTUAL,
      get() {
        return [
          {
            citationId: this.citationId,
            findingId: this.findingId,
            grantId: this.grantId,
            grantNumber: this.grantNumber,
            reviewName: this.reviewName,
            standardId: this.standardId,
            findingType: this.findingType,
            findingSource: this.findingSource,
            acro: this.acro,
            name: this.name,
            severity: this.severity,
            reportDeliveryDate: this.reportDeliveryDate,
            monitoringFindingStatusName: this.monitoringFindingStatusName,
            citation: this.citation,
          },
        ];
      },
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveCitation',
  });
  return ActivityReportObjectiveCitation;
};
