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
  class CloseSuspendReason extends Model {
    static associate(models) {
      CloseSuspendReason.belongsTo(models.CloseSuspendReason, {
        foreignKey: 'mapsTo',
        as: 'mapsToCloseSuspendReason',
      });
      CloseSuspendReason.hasMany(models.CloseSuspendReason, {
        foreignKey: 'mapsTo',
        as: 'mapsFromCloseSuspendReasons',
      });

      CloseSuspendReason.belongsTo(models.ValidFor, {
        foreignKey: 'validForId',
        as: 'validFor',
      });

      models.ValidFor.hasMany(models.CloseSuspendReason, {
        foreignKey: 'validForId',
        as: 'validForCloseSuspendReasons',
      });

      CloseSuspendReason.addScope('validFor', (name) => ({
        includes: [{
          model: models.ValidFor,
          as: 'validFor',
          required: true,
          where: { name },
        }],
      }));

      CloseSuspendReason.addScope('defaultScope', {
        include: [{
          model: models.CloseSuspendReason,
          as: 'mapsToCloseSuspendReason',
          required: false,
        }],
      });
    }
  }
  CloseSuspendReason.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    forSuspend: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    forClose: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    validForId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToStatus').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToStatus').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'CloseSuspendReason',
    paranoid: true,
  });
  return CloseSuspendReason;
};
