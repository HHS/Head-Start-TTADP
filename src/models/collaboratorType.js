const {
  Model,
  Op,
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
  class CollaboratorType extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

      models.CollaboratorType.addScope('defaultScope', {
        include: [{
          model: models.CollaboratorType,
          as: 'mapsToCollaboratorType',
          required: false,
        }],
      });
    }
  }
  CollaboratorType.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
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
          tableName: 'CollaboratorTypes',
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
          ? this.get('mapsToCollaboratorType').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'CollaboratorType',
    paranoid: true,
  });
  return CollaboratorType;
};
