const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveCourse extends Model {
    static associate(models) {
      ActivityReportObjectiveCourse.belongsTo(models.ActivityReportObjective, {
        foreignKey: 'activityReportObjectiveId',
        onDelete: 'cascade',
        as: 'activityReportObjective',
      })
      ActivityReportObjectiveCourse.belongsTo(models.Course, {
        foreignKey: 'courseId',
        as: 'course',
      })
      models.Course.hasMany(models.ActivityReportObjectiveCourse, {
        foreignKey: 'courseId',
        as: 'activityReportObjectiveCourses',
      })

      models.ActivityReportObjective.belongsToMany(models.Course, {
        through: models.ActivityReportObjectiveCourse,
        foreignKey: 'activityReportObjectiveId',
        otherKey: 'courseId',
        as: 'courses',
      })

      models.Course.belongsToMany(models.ActivityReportObjective, {
        through: models.ActivityReportObjectiveCourse,
        foreignKey: 'courseId',
        otherKey: 'activityReportObjectiveId',
        as: 'reportObjectives',
      })
    }
  }
  ActivityReportObjectiveCourse.init(
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
      courseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      createdAt: {
        allowNull: false,
        type: DataTypes.DATE,
      },
    },
    {
      sequelize,
      modelName: 'ActivityReportObjectiveCourse',
      tableName: 'ActivityReportObjectiveCourses',
      freezeTableName: true,
    }
  )
  return ActivityReportObjectiveCourse
}
