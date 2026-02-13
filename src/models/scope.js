const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class Scope extends Model {
    static associate(models) {
      Scope.belongsToMany(models.Region, {
        through: models.Permission,
        foreignKey: 'regionId',
        as: 'regions',
        timestamps: false,
      })
      Scope.belongsToMany(models.User, {
        through: models.Permission,
        foreignKey: 'scopeId',
        as: 'users',
        timestamps: false,
      })
      Scope.hasMany(models.Permission, { foreignKey: 'scopeId', as: 'permissions' })
    }
  }
  Scope.init(
    {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      description: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Scope',
    }
  )
  return Scope
}
