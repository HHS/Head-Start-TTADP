const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Status extends Model {
    static associate(models) {
      Status.belongsTo(models.Status, {
        foreignKey: 'mapsTo',
        as: 'mapsToStatus',
      });
      Status.hasMany(models.Status, {
        foreignKey: 'mapsTo',
        as: 'mapsFromStatuses',
      });
      Status.belongsTo(models.Report, {
        foreignKey: 'statusId',
        as: 'report',
      });
    }
  }
  Status.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    validFor: {
      type: DataTypes.ENUM(Object.values(ENTITY_TYPE)),
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'Status',
    paranoid: true,
  });
  return Status;
};
