const {
  Model,
} = require('sequelize');

export default (sequelize, DataTypes) => {
  class Region extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      Region.hasMany(models.Grant, { foreignKey: 'regionId', as: 'grants' });
      Region.hasMany(models.User, {
        foreignKey: 'homeRegionId',
        as: 'users',
      });
      Region.belongsToMany(models.Scope, {
        through: models.Permission,
        foreignKey: 'regionId',
        as: 'scopes',
        timestamps: false,
      });
      Region.hasMany(models.ActivityReport, { foreignKey: 'regionId', as: 'activityReports' });
      Region.hasMany(models.CollabReport, { foreignKey: 'regionId', as: 'collabReports' });
      Region.hasMany(models.GoalTemplate, { foreignKey: 'regionId', as: 'goalTemplates' });
      Region.hasMany(models.ObjectiveTemplate, { foreignKey: 'regionId', as: 'objectiveTemplates' });
      Region.hasMany(models.Permission, { foreignKey: 'regionId', as: 'permissions' });
    }
  }
  Region.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Region',
    timestamps: false,
  });
  return Region;
};
