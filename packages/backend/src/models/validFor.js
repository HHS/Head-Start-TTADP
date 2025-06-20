const {
  Model,
  Op,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

/**
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ValidFor extends Model {
    static associate(models) {
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
          model: models.ValidFor.scope(),
          as: 'mapsToValidFor',
          attributes: [],
          required: false,
        }],
      });

      models.ValidFor.addScope('reports', {
        where: {
          isReport: true,
        },
        include: [{
          model: models.ValidFor.scope(),
          as: 'mapsToValidFor',
          attributes: [],
          required: false,
        }],
      });
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
    /** The mapsTo column is a crucial component designed to enable flexible
     * handling of enumerated values. It serves as a reference to another entry
     * within the same enumeration table. When defined, the mapsTo column
     * specifies an alternative or replacement value for a particular name entry.
     * In various database operations, when a mapsTo value is defined for an
     * entry, it takes precedence over the original name value, ensuring that the
     * mapped value is consistently used in place of the original when selected
     * or loaded. This feature enhances the table's versatility by allowing for
     * the seamless substitution of mapped values, offering adaptability for
     * various display and analytical purposes, while retaining the integrity
     * of the original data. */
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
  }, {
    sequelize,
    modelName: 'ValidFor',
    tableName: 'ValidFor',
    paranoid: true,
  });
  return ValidFor;
};
