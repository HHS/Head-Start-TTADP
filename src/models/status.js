const {
  Model,
} = require('sequelize');
const { REPORT_TYPE, ENTITY_TYPE } = require('../constants');
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
  class Status extends Model {
    static async preloadScopes(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

      models.Status.addScope('defaultScope', {
        include: [{
          model: models.Status,
          as: 'mapsToStatus',
          required: false,
        }],
      });

      models.Status.addScope('validFor', (name) => ({
        include: [{
          model: models.ValidFor,
          as: 'validFor',
          attributes: [],
          required: true,
          where: { name },
        }],
      }));
    }

    static async associate(models) {
    }
  }
  Status.init({
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
    isTerminal: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      default: false,
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
    ordinal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: {
          tableName: 'Statuses',
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
    modelName: 'Status',
    paranoid: true,
  });
  return Status;
};
