const { Model } = require('sequelize')

export default (sequelize, DataTypes) => {
  class Permission extends Model {
    static associate(models) {
      Permission.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' })
      Permission.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
      Permission.belongsTo(models.Scope, { foreignKey: 'scopeId', as: 'scope' })
    }
  }
  Permission.init(
    {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: DataTypes.INTEGER,
      },
      regionId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      scopeId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Permission',
    }
  )
  return Permission
}
