const {
  Model, Op,
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
      Recipient.hasMany(models.CommunicationLogRecipient, { foreignKey: 'recipientId', as: 'communicationLogRecipients' });
      Recipient.belongsToMany(models.CommunicationLog, {
        through: models.CommunicationLogRecipient,
        foreignKey: 'recipientId',
        otherKey: 'communicationLogId',
        as: 'logs',
      });
    }
  }
  Recipient.init({
    uei: {
      type: DataTypes.STRING,
      allowNull: true,
      // eslint-disable-next-line @typescript-eslint/quotes
      defaultValue: sequelize.literal(`''::character varying`),
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: false,
    },
    recipientType: {
      type: DataTypes.STRING,
    },
    deleted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'Recipient',
  });
  return Recipient;
};
