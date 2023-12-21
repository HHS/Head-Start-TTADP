const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class Course extends Model {
    static associate(models) {
      Course.hasMany(models.ObjectiveCourse, { foreignKey: 'courseId', as: 'objectiveCourses' });
      Course.hasMany(models.ActivityReportObjectiveCourse, { foreignKey: 'courseId', as: 'activityReportObjectiveCourses' });

      Course.hasMany(models.Course, {
        foreignKey: 'mapsTo',
        as: 'mapsFromCourse',
      });
      Course.belongsTo(models.Course, {
        foreignKey: 'mapsTo',
        as: 'mapsToCourse',
      });
    }
  }
  Course.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    nameLookUp: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Course',
        },
        key: 'id',
      },
    },
    updatedAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    createdAt: {
      allowNull: false,
      type: DataTypes.DATE,
    },
    deletedAt: {
      allowNull: true,
      type: DataTypes.DATE,
    },
  }, {
    sequelize,
    modelName: 'Course',
    tableName: 'Courses',
    freezeTableName: true,
  });
  return Course;
};
