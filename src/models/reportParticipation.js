const {
  Model,
} = require('sequelize');
const {
  automaticallyGenerateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');
const { DELIVERY_METHOD } = require('../constants');

/**
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportParticipation extends Model {
    static async associate(models) {
      await automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportParticipation.init({
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'Reports',
        },
        key: 'id',
      },
    },
    // TODO: need a hook to keep this upto date based on the other two
    participantCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    inpersonParticipantCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    virtualParticipantCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    deliveryMethod: {
      type: new DataTypes.ENUM(Object.values(DELIVERY_METHOD)),
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'ReportParticipation',
    tableName: 'ReportParticipation',
    freezeTableName: true,
  });
  return ReportParticipation;
};
