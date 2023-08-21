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
      TargetPopulation.belongsTo(models.TargetPopulation, {
        foreignKey: 'mapsTo',
        as: 'mapsToTargetPopulation',
      });
      TargetPopulation.hasMany(models.TargetPopulation, {
        foreignKey: 'mapsTo',
        as: 'mapsFromTargetPopulations',
      });

      models.TargetPopulation.addScope('defaultScope', {
        include: [{
          model: models.TargetPopulation,
          as: 'mapsToTargetPopulation',
          required: false,
        }],
      });
    }
  }
  TargetPopulation.init({
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
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToTargetPopulation').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToTargetPopulation').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'TargetPopulation',
    paranoid: true,
  });
  return TargetPopulation;
};
