const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class Organizer extends Model {
    static associate(models) {
      Organizer.belongsTo(models.Organizer, {
        foreignKey: 'mapsTo',
        as: 'mapsToOrganizer',
      });
      Organizer.hasMany(models.Organizer, {
        foreignKey: 'mapsTo',
        as: 'mapsFromOrganizers',
      });

      Organizer.belongsTo(models.ValidFor, {
        foreignKey: 'validForId',
        as: 'validFor',
      });

      models.ValidFor.hasMany(models.Organizer, {
        foreignKey: 'validForId',
        as: 'validForOrganizers',
      });

      models.Organizer.addScope('defaultScope', {
        include: [{
          model: models.Organizer,
          as: 'mapsToOrganizer',
          required: false,
        }],
      });
    }
  }
  Organizer.init({
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
    },
    mapsTo: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    latestName: {
      type: DataTypes.VIRTUAL(DataTypes.STRING),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToOrganizer').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToOrganizer').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'Organizer',
    paranoid: true,
  });
  return Organizer;
};
