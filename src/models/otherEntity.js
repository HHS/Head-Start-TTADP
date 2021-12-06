const {
  Model,
} = require('sequelize');

/**
 * OtherEntity table
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class OtherEntity extends Model {
    static associate() {}
  }
  OtherEntity.init({
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
  }, {
    sequelize,
    modelName: 'OtherEntity',
  });
  return OtherEntity;
};
