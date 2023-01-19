const {
  Model,
} = require('sequelize');

/**
 * Recipients table. Stores recipients.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Recipient extends Model {
    static associate(models) {
      Recipient.hasMany(models.Grant, { as: 'grants', foreignKey: 'recipientId' });
    }
  }
  Recipient.init({
    uei: {
      type: DataTypes.STRING,
      allowNull: true,
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
