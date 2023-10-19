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
  class Audience extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

      models.Audience.addScope('defaultScope', {
        include: [{
          model: models.Audience.scope(),
          as: 'mapsToAudience',
          attributes: [],
          required: false,
        }],
      });
    }
  }
  Audience.init({
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
          tableName: 'Audiences',
        },
        key: 'id',
      },
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToAudience').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToAudience').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'Audience',
    paranoid: true,
  });
  return Audience;
};
