const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');
const {
  automaticallyGenerateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class Reason extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

      models.Reason.addScope('defaultScope', {
        include: [{
          model: models.Reason,
          as: 'mapsToReason',
          required: false,
        }],
      });
    }
  }
  Reason.init({
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
          tableName: 'Reasons',
        },
        key: 'id',
      },
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToReason').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToReason').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'Reason',
    paranoid: true,
  });
  return Reason;
};
