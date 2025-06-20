const { Model } = require('sequelize');

export default (sequelize, DataTypes) => {
  class CommunicationLog extends Model {
    static associate(models) {
      CommunicationLog.belongsTo(models.User, { foreignKey: 'userId', as: 'author' });
      CommunicationLog.hasMany(models.CommunicationLogFile, { foreignKey: 'communicationLogId', as: 'communicationLogFiles' });
      CommunicationLog.hasMany(models.CommunicationLogRecipient, { foreignKey: 'communicationLogId', as: 'communicationLogRecipients' });
      CommunicationLog.belongsToMany(models.File, {
        through: models.CommunicationLogFile,
        foreignKey: 'communicationLogId',
        otherKey: 'fileId',
        as: 'files',
      });
      CommunicationLog.belongsToMany(models.Recipient, {
        through: models.CommunicationLogRecipient,
        foreignKey: 'communicationLogId',
        otherKey: 'recipientId',
        as: 'recipients',
      });
    }
  }

  CommunicationLog.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    displayId: {
      type: DataTypes.VIRTUAL(DataTypes.STRING, ['id', 'data']),
      get() {
        const { id, data: { regionId } } = this;
        return `R${String(regionId).padStart(2, '0')}-CL-${String(id).padStart(5, '0')}`;
      },
    },
    userId: {
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
