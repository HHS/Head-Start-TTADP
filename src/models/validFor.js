const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

/**
 * Status table. Stores topics used in activity reports and tta plans.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ValidFor extends Model {
    static preloadScopes(models) {
      ValidFor.belongsTo(models.ValidFor, {
        foreignKey: 'mapsTo',
        as: 'mapsToValidFor',
      });

      ValidFor.hasMany(models.ValidFor, {
        foreignKey: 'mapsTo',
        as: 'mapsFromValidFor',
      });

      models.ValidFor.addScope('defaultScope', {
        include: [{
          model: models.ValidFor,
          as: 'mapsToValidFor',
          required: false,
        }],
      });

      models.ValidFor.addScope('reports', {
        where: {
          isReport: true,
        },
        include: [{
          model: models.ValidFor,
          as: 'mapsToValidFor',
          attributes: [],
          required: false,
        }],
      });
    }

    static associate(models) {
    }
  }
  ValidFor.init({
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
    isReport: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'ValidFor',
        },
        key: 'id',
      },
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToCollaboratorType').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToValidFor').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'ValidFor',
    tableName: 'ValidFor',
    paranoid: true,
  });
  return ValidFor;
};
