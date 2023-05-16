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
  class CollaboratorType extends Model {
    static associate(models) {
      CollaboratorType.belongsTo(models.CollaboratorType, {
        foreignKey: 'mapsTo',
        as: 'mapsToCollaboratorType',
      });
      CollaboratorType.hasMany(models.CollaboratorType, {
        foreignKey: 'mapsTo',
        as: 'mapsFromCollaboratorTypes',
      });

      // TODO: make a scope to perform the mapTo automatically

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
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    validFor: {
      type: DataTypes.ENUM(Object.values(ENTITY_TYPE)),
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
