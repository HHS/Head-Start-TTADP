const {
  Model,
} = require('sequelize');
const {
  automaticallyGenerateJunctionTableAssociations,
} = require('./helpers/associationsAndScopes');

/**
 * @param {} sequelize
 * @param {*} DataTypes
 */
export default (sequelize, DataTypes) => {
  class ReportParticipation extends Model {
    static associate(models) {
      automaticallyGenerateJunctionTableAssociations(this, models);
    }
  }
  ReportParticipation.init({
    id: {
      type: DataTypes.BIGINT,
      primaryKey: true,
      autoIncrement: true,
      allowNull: false,
    },
    reportId: {
      type: DataTypes.BIGINT,
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
      type: new DataTypes.VIRTUAL(DataTypes.STRING, [
        'inpersonParticipantCount',
        'virtualParticipantCount',
      ]),
      get() {
        const inperson = !Number.isNaN(this.get('inpersonParticipantCount'));
        const virtual = !Number.isNaN(this.get('virtualParticipantCount'));

        switch (true) {
          case inperson && virtual:
            return 'hybrid';
          case inperson:
            return 'in-person';
          case virtual:
            return 'virtual';
          default:
            return null;
        }
      },
    },
  }, {
    sequelize,
    modelName: 'ReportParticipation',
    tableName: 'ReportParticipation',
    freezeTableName: true,
  });
  return ReportParticipation;
};
