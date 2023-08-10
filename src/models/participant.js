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
    },
    name: {
      type: DataTypes.TEXT,
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
