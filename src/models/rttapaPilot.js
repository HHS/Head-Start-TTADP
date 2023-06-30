const { Model } = require('sequelize');
const { formatDate } = require('../lib/modelHelpers');

/**
 * @param {} sequelize
 * @param {*} DataTypes
 */

export default (sequelize, DataTypes) => {
  class RttapaPilot extends Model {
    static associate(models) {
      RttapaPilot.belongsTo(models.User, { foreignKey: 'userId', as: 'user' });
      RttapaPilot.belongsTo(models.Recipient, { foreignKey: 'recipientId', as: 'recipient' });
      RttapaPilot.belongsTo(models.Region, { foreignKey: 'regionId', as: 'region' });
      RttapaPilot.addScope('defaultScope', {
        include: [{
          attributes: [],
          model: models.User,
          as: 'user',
        }],
      });
    }
  }
  RttapaPilot.init({
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
    regionId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    notes: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    goals: {
      type: DataTypes.JSONB,
      allowNull: true,
    },
    reviewDate: {
      type: DataTypes.DATE,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'RttapaPilot',
  });
  return RttapaPilot;
};
