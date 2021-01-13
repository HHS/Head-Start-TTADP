const {
  Model,
} = require('sequelize');

/**
 * NonGrantee table
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class NonGrantee extends Model {
    static associate() {}
  }
  NonGrantee.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'NonGrantee',
  });
  return NonGrantee;
};
