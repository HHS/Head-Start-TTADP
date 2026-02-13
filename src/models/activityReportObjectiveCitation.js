const { Model } = require('sequelize')

/**
 * Junction table between ARO and Citations.
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveCitation extends Model {
    static associate(models) {
      // ARO.
      ActivityReportObjectiveCitation.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      })
      // ARO Citations.
      models.ActivityReportObjective.hasMany(models.ActivityReportObjectiveCitation, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjectiveCitations',
      })
    }
  }
  ActivityReportObjectiveCitation.init(
    {
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
      citation: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      /*
      We want to track as a single entity a link to N findings containing the same citation.
      This would require a lot of database structure to represent traditionally, but because the
      subset of imported monitoring data we reference is expected to remain completely static,
      referential drift is not expected to ever become a problem.
      So, the JSONB allows us to encapsulate the complications with minimal structure
      In addition, the data in this field is tracked as citation per grant.
      This also allows us to quickly display the data without have to join monitoring tables.
    */
      monitoringReferences: {
        type: DataTypes.JSONB,
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
      findingIds: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.monitoringReferences.map((reference) => reference.findingId)
        },
      },
      grantNumber: {
        type: DataTypes.VIRTUAL,
        get() {
          const [reference] = this.monitoringReferences
          if (!reference) return null
          return reference.grantNumber
        },
      },
      reviewNames: {
        type: DataTypes.VIRTUAL,
        get() {
          return this.monitoringReferences.map((reference) => reference.reviewName)
        },
      },
    },
    {
      sequelize,
      modelName: 'ActivityReportObjectiveCitation',
    }
  )
  return ActivityReportObjectiveCitation
}
