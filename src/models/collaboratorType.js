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
  class CollaboratorType extends Model {
    static associate(models) {
      CollaboratorType.belongsTo(models.CollaboratorType, { foreignKey: 'mapsTo', as: 'mapsToCollaboratorType' });
      CollaboratorType.hasMany(models.CollaboratorType, { foreignKey: 'mapsTo', as: 'mapsFromCollaboratorTypes' });
      CollaboratorType.hasMany(models.ReportCollaboratorType, {
        foreignKey: 'collaboratorTypeId',
        as: 'reportCollaboratorType',
      });
      CollaboratorType.belongsToMany(models.ReportCollaborator, {
        through: models.ReportCollaboratorType,
        foreignKey: 'collaboratorTypeId',
        otherKey: 'reportCollaboratorId',
        as: 'reportCollaborators',
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
      unique: true,
    },
    validFor: {
      type: DataTypes.ENUM(Object.values(ENTITY_TYPE)),
      allowNull: false,
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
  }, {
    sequelize,
    modelName: 'CollaboratorType',
    paranoid: true,
  });
  return CollaboratorType;
};
