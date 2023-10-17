const {
  Model,
} = require('sequelize');
const { ENTITY_TYPE } = require('../constants');
const {
  automaticallyGenerateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');

export default (sequelize, DataTypes) => {
  class Participant extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);

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
          tableName: 'Participants',
        },
        key: 'id',
      },
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
