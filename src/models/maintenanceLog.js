const { Model } = require('sequelize');
const { MAINTENANCE_TYPE, MAINTENANCE_CATEGORY } = require('../constants');

export default (sequelize, DataTypes) => {
  class MaintenanceLog extends Model {
    static associate(models) {
    }
  }
  MaintenanceLog.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      autoIncrement: true,
    },
    category: {
      allowNull: false,
      type: DataTypes.DataTypes.ENUM(Object.values(MAINTENANCE_CATEGORY)),
    },
    type: {
      allowNull: false,
      type: DataTypes.DataTypes.ENUM(Object.values(MAINTENANCE_TYPE)),
    },
    data: {
      allowNull: false,
      type: DataTypes.JSON,
    },
    isSuccessful: {
      type: DataTypes.BOOLEAN,
    },
  }, {
    sequelize,
    modelName: 'MaintenanceLog',
  });
  return MaintenanceLog;
};
