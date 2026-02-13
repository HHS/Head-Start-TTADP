const { Model, Op } = require('sequelize')

export default (sequelize, DataTypes) => {
  class NationalCenterUser extends Model {
    static associate(models) {
      // National center user has a user.
      NationalCenterUser.belongsTo(models.User, { foreignKey: 'userId', as: 'user' })
      // National center user has a national center.
      NationalCenterUser.belongsTo(models.NationalCenter, {
        foreignKey: 'nationalCenterId',
        as: 'nationalCenter',
      })
    }
  }
  NationalCenterUser.init(
    {
      id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
      },
      nationalCenterId: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
      userId: {
        allowNull: false,
        type: DataTypes.INTEGER,
      },
    },
    {
      sequelize,
      modelName: 'NationalCenterUser',
      tableName: 'NationalCenterUsers',
      freezeTableName: true,
    }
  )
  return NationalCenterUser
}
