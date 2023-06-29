const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class NationalCenter extends Model {}
  NationalCenter.init({
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
    modelName: 'NationalCenter',
  });
  return NationalCenter;
};
