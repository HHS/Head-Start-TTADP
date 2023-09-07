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
  class SupportType extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);

      models.SupportType.addScope('defaultScope', {
        include: [{
          model: models.SupportType,
          as: 'mapsToSupportType',
          required: false,
        }],
      });
    }
  }
  SupportType.init({
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
          tableName: 'SupportTypes',
        },
        key: 'id',
      },
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToSupportType').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToSupportType').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'SupportType',
    paranoid: true,
  });
  return SupportType;
};
