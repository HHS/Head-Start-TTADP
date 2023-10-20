const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class CloseSuspendReason extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

      CloseSuspendReason.addScope('validFor', (name) => ({
        include: [{
          model: models.ValidFor,
          as: 'validFor',
          required: true,
          where: { name },
        }],
      }));

      CloseSuspendReason.addScope('defaultScope', {
        include: [{
          model: models.CloseSuspendReason.scope(),
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
      references: {
        model: {
          tableName: 'ValidFor',
        },
        key: 'id',
      },
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'CloseSuspendReasons',
        },
        key: 'id',
      },
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
