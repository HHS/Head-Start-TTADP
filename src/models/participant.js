const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');

export default (sequelize, DataTypes) => {
  class Participant extends Model {
    static associate(models) {
      Participant.belongsTo(models.Organizer, {
        foreignKey: 'mapsTo',
        as: 'mapsToParticipant',
      });
      Participant.hasMany(models.Organizer, {
        foreignKey: 'mapsTo',
        as: 'mapsFromParticipants',
      });

      Participant.belongsTo(models.ValidFor, {
        foreignKey: 'validForId',
        as: 'validFor',
      });

      models.ValidFor.hasMany(models.Participant, {
        foreignKey: 'validForId',
        as: 'validForParticipants',
      });

      models.Participant.addScope('defaultScope', {
        include: [{
          model: models.Participant,
          as: 'mapsToParticipant',
          required: false,
        }],
      });
    }
  }
  Participant.init({
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
          ? this.get('mapsToParticipant').get('name')
          : this.get('name');
      },
    },
    latestId: {
      type: DataTypes.VIRTUAL(DataTypes.INTEGER),
      get() {
        return this.get('mapsTo')
          ? this.get('mapsToParticipant').get('id')
          : this.get('id');
      },
    },
  }, {
    sequelize,
    modelName: 'Participant',
    paranoid: true,
  });
  return Participant;
};
