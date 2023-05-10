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
  class TargetPopulation extends Model {
    static associate(models) {
      TargetPopulation.belongsTo(models.TargetPopulation, { foreignKey: 'mapsTo', as: 'mapsToTargetPopulation' });
      TargetPopulation.hasMany(models.TargetPopulation, { foreignKey: 'mapsTo', as: 'mapsFromTargetPopulations' });
      TargetPopulation.hasMany(models.ReportTargetPopulation, {
        foreignKey: 'targetPopulationId',
        as: 'reportTargetPopulations',
      });
      TargetPopulation.belongsToMany(models.Report, {
        through: models.ReportTargetPopulation,
        foreignKey: 'targetPopulationId',
        otherKey: 'reportId',
        as: 'reports',
      });
    }
  }
  TargetPopulation.init({
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
    modelName: 'TargetPopulation',
    paranoid: true,
  });
  return TargetPopulation;
};
