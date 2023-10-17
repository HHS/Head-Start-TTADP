const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');
const { automaticallyGenerateJunctionTableAssociations } = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class Organizer extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

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
          tableName: 'Organizers',
        },
        key: 'id',
      },
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
