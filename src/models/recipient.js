const {
  Model,
} = require('sequelize');

/**
 * Recipients table. Stores recipients.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Recipient extends Model {
    static associate(models) {
      Recipient.hasMany(models.Grant, { as: 'grants', foreignKey: 'recipientId' });
    }
  }
  Recipient.init({
    uei: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
    recipientType: {
      type: DataTypes.STRING,
    },
  }, {
    sequelize,
    modelName: 'Recipient',
  });
  return Recipient;
};
