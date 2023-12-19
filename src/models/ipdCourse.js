const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class IpdCourse extends Model {
    static associate(models) {
      // IpdCourse.belongsTo(models.Objective, { foreignKey: 'objectiveId', as: 'objective' });
      // eslint-disable-next-line max-len
      // IpdCourse.belongsTo(models.ActivityReportObjective, { foreignKey: 'activityReportObjectiveId', as: 'activityReportObjective' });

      IpdCourse.hasMany(models.IpdCourse, {
        foreignKey: 'mapsTo',
        as: 'mapsFromIpdCourse',
      });
      IpdCourse.belongsTo(models.IpdCourse, {
        foreignKey: 'mapsTo',
        as: 'mapsToIpdCourse',
      });
    }
  }
  IpdCourse.init({
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
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'ValidFor',
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
    modelName: 'IpdCourse',
    tableName: 'IpdCourses',
    paranoid: true,
    freezeTableName: true,
  });
  return IpdCourse;
};
