const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Scope extends Model {
    static associate(models) {
      Scope.belongsToMany(models.Region, { through: models.Permission, foreignKey: 'regionId', timestamps: false });
      Scope.belongsToMany(models.User, {
        through: models.Permission, foreignKey: 'scopeId', as: 'scopes', timestamps: false,
      });
    }
  }
  Scope.init({
    name: DataTypes.STRING,
    description: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Scope',
  });
  return Scope;
};
