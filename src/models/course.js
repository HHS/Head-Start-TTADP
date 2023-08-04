const {
  Model,
} = require('sequelize');

export default (sequelize, DataTypes) => {
  class Course extends Model {
    static associate() {
    }
  }
  Course.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      allowNull: false,
      type: DataTypes.STRING,
    },
    inactiveDate: {
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
