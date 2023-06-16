const { Model } = require('sequelize');
const { DB_MAINTENANCE_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class DBMaintenanceLog extends Model {
    static associate(models) {
    }
  }
  DBMaintenanceLog.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: null,
      comment: null,
      primaryKey: true,
      autoIncrement: true,
    },
    type: {
      allowNull: false,
      type: DataTypes.DataTypes.ENUM(Object.values(DB_MAINTENANCE_TYPE)),
    },
    data: {
      allowNull: false,
      type: DataTypes.JSON,
    },
    isSuccessful: {
      type: DataTypes.Boolean,
    },
  }, {
    sequelize,
    modelName: 'DBMaintenanceLog',
  });
  return DBMaintenanceLog;
};
