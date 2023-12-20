const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class ObjectiveIpdCourse extends Model {
    static associate(models) {
      ObjectiveIpdCourse.belongsTo(models.Objective, { foreignKey: 'objectiveId', onDelete: 'cascade', as: 'objective' });
      ObjectiveIpdCourse.belongsTo(models.IpdCourse, { foreignKey: 'ipdCourseId', as: 'ipdCourse' });
    }
  }
  ObjectiveIpdCourse.init({
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
    modelName: 'ObjectiveIpdCourse',
    tableName: 'ObjectiveIpdCourses',
    freezeTableName: true,
  });
  return ObjectiveIpdCourse;
};
