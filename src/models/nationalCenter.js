const { Model } = require('sequelize');
const { afterDestroy } = require('./hooks/nationalCenter');

export default (sequelize, DataTypes) => {
  class NationalCenter extends Model {}
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
    paranoid: true,
    sequelize,
    hooks: {
      afterDestroy: async (instance) => afterDestroy(sequelize, instance),
    },
    modelName: 'NationalCenter',
  });
  return NationalCenter;
};
