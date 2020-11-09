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
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'Scope',
  });
  return Scope;
};
