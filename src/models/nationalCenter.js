const { Model } = require('sequelize')
const { afterDestroy, afterUpdate } = require('./hooks/nationalCenter')

export default (sequelize, DataTypes) => {
  class NationalCenter extends Model {
    static associate(models) {
      // A National center can belong to a user through a national center user.
      NationalCenter.hasMany(models.NationalCenterUser, {
        foreignKey: 'nationalCenterId',
        as: 'nationalCenterUsers',
      })
      NationalCenter.belongsToMany(models.User, {
        through: models.NationalCenterUser,
        foreignKey: 'nationalCenterId',
        as: 'users',
      })
      NationalCenter.belongsTo(models.NationalCenter, {
        foreignKey: 'mapsTo',
        as: 'mapsToNationalCenter',
      })
      NationalCenter.hasMany(models.NationalCenter, {
        foreignKey: 'mapsTo',
        as: 'mapsFromNationalCenters',
      })
    }
  }
  NationalCenter.init(
    {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      name: {
        type: DataTypes.TEXT,
        allowNull: false,
        validate: {
          notNull: true,
          notEmpty: true,
        },
        unique: true,
      },
      mapsTo: {
        type: DataTypes.INTEGER,
        allowNull: true,
        defaultValue: null,
        references: {
          model: {
            tableName: 'NationalCenters',
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
    },
    {
      sequelize,
      hooks: {
        afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
        afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
      },
      modelName: 'NationalCenter',
    }
  )
  return NationalCenter
}
