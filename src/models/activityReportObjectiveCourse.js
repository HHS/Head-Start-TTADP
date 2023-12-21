const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveCourse extends Model {
    static associate(models) {
      ActivityReportObjectiveCourse.belongsTo(models.ActivityReportObjective, { foreignKey: 'activityReportObjectiveId', onDelete: 'cascade', as: 'activityReportObjective' });
      ActivityReportObjectiveCourse.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
    }
  }
  ActivityReportObjectiveCourse.init({
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
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveCourse',
    tableName: 'ActivityReportObjectiveCourses',
    freezeTableName: true,
  });
  return ActivityReportObjectiveCourse;
};
