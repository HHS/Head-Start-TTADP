const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CommunicationLog extends Model {
    static associate(models) {
      CommunicationLog.belongsTo(models.Recipient, { foreignKey: 'recipientId', as: 'recipient' });
      CommunicationLog.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
    }
  }

  CommunicationLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    recipientId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    data: {
      type: DataTypes.JSONB,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'CommunicationLog',
  });

  return CommunicationLog;
};
