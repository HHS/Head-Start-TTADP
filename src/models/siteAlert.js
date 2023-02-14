const {
  Model,
} = require('sequelize');
const { ALERT_STATUSES, ALERT_VARIANTS } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');

const possibleStatuses = Object.values(ALERT_STATUSES);
const possibleVariants = Object.values(ALERT_VARIANTS);

/**
   *
   * @param {} sequelize
   * @param {*} DataTypes
   */

export default (sequelize, DataTypes) => {
  class SiteAlert extends Model {
    static associate(models) {
      SiteAlert.belongsTo(models.User, { foreignKey: 'userId', as: 'creator' });
    }
  }
  SiteAlert.init({
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Users',
        },
        key: 'id',
      },
    },
    startDate: {
      type: DataTypes.DATE,
      allowNull: false,
      get: formatDate,
    },
    endDate: {
      type: DataTypes.DATE,
      allowNull: false,
      get: formatDate,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    message: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM(possibleStatuses),
    },
    variant: {
      type: DataTypes.ENUM(possibleVariants),
    },
  }, {
    sequelize,
    modelName: 'SiteAlert',
  });
  return SiteAlert;
};
