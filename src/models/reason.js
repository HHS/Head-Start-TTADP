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
  class Reason extends Model {
    static associate(models) {
      Reason.belongsTo(models.Reason, { foreignKey: 'mapsTo', as: 'mapsToReason' });
      Reason.hasMany(models.Reason, { foreignKey: 'mapsTo', as: 'mapsFromReasons' });
      Reason.hasMany(models.ReportReason, {
        foreignKey: 'reasonId',
        as: 'reportReasons',
      });
      Reason.belongsToMany(models.Report, {
        through: models.ReportReason,
        foreignKey: 'reasonId',
        otherKey: 'reportId',
        as: 'reports',
      });
    }
  }
  Reason.init({
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
    modelName: 'Reason',
    paranoid: true,
  });
  return Reason;
};
