const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ObjectiveCourse extends Model {
    static associate(models) {
      ObjectiveCourse.belongsTo(models.Objective, { foreignKey: 'objectiveId', onDelete: 'cascade', as: 'objective' });
      ObjectiveCourse.belongsTo(models.Course, { foreignKey: 'courseId', as: 'course' });
      models.Course.hasMany(models.ObjectiveCourse, { foreignKey: 'courseId', as: 'objectiveCourses' });

      models.Course.belongsToMany(models.Objective, {
        through: models.ObjectiveCourse,
        foreignKey: 'courseId',
        otherKey: 'objectiveId',
        as: 'objectives',
      });

      models.Objective.belongsToMany(models.Course, {
        through: models.ObjectiveCourse,
        foreignKey: 'objectiveId',
        otherKey: 'courseId',
        as: 'courses',
      });
    }
  }
  ObjectiveCourse.init({
    id: {
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
      type: DataTypes.INTEGER,
    },
    objectiveId: {
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
    modelName: 'ObjectiveCourse',
    tableName: 'ObjectiveCourses',
    freezeTableName: true,
  });
  return ObjectiveCourse;
};
