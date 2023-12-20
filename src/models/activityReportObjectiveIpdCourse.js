const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ActivityReportObjectiveIpdCourse extends Model {
    static associate(models) {
      ActivityReportObjectiveIpdCourse.belongsTo(models.ActivityReportObjective, { foreignKey: 'activityReportObjectiveId', onDelete: 'cascade', as: 'activityReportObjective' });
      ActivityReportObjectiveIpdCourse.belongsTo(models.IpdCourse, { foreignKey: 'ipdCourseId', as: 'ipdCourse' });
    }
  }
  ActivityReportObjectiveIpdCourse.init({
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
    ipdCourseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'ActivityReportObjectiveIpdCourse',
    tableName: 'ActivityReportObjectiveIpdCourses',
    freezeTableName: true,
  });
  return ActivityReportObjectiveIpdCourse;
};
