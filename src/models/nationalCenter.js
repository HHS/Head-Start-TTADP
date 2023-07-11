const { Model } = require('sequelize');
const { afterDestroy, afterUpdate } = require('./hooks/nationalCenter');

export default (sequelize, DataTypes) => {
  class NationalCenter extends Model {
    static associate(models) {
      NationalCenter.belongsTo(models.NationalCenter, {
        foreignKey: 'mapsTo',
        as: 'mapsToNationalCenter',
      });
      NationalCenter.hasMany(models.NationalCenter, {
        foreignKey: 'mapsTo',
        as: 'mapsFromNationalCenters',
      });
    }
  }
  NationalCenter.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
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
    },
  }, {
    sequelize,
    hooks: {
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
      afterDestroy: async (instance, options) => afterDestroy(sequelize, instance, options),
    },
    modelName: 'NationalCenter',
  });
  return NationalCenter;
};
