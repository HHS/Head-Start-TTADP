const {
  Model,
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
  class ReportParticipationParticipant extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportParticipationParticipant.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportParticipationId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'ReportParticipation',
        },
        key: 'id',
      },
    },
    participantId: {
      type: DataTypes.BIGINT,
      allowNull: false,
      references: {
        model: {
          tableName: 'Participants',
        },
        key: 'id',
      },
    },
  }, {
    sequelize,
    modelName: 'ReportParticipationParticipant',
    paranoid: true,
  });
  return ReportParticipationParticipant;
};
