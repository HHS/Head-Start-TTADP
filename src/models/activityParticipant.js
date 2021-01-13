import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ActivityParticipant extends Model {
    static associate(models) {
      ActivityParticipant.belongsTo(models.ActivityReport, { foreignKey: 'activityReportId' });
      ActivityParticipant.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grant' });
      ActivityParticipant.belongsTo(models.NonGrantee, { foreignKey: 'nonGranteeId', as: 'nonGrantee' });
    }
  }
  ActivityParticipant.init({
    activityReportId: {
      allowNull: false,
      type: DataTypes.INTEGER,
    },
    grantId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    nonGranteeId: {
      allowNull: true,
      type: DataTypes.INTEGER,
    },
    participantId: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.grant) {
          return this.grant.id;
        }
        return this.nonGrantee.id;
      },
    },
    name: {
      type: DataTypes.VIRTUAL,
      get() {
        if (this.grant) {
          return this.grant.name;
        }
        return this.nonGrantee.name;
      },
    },
  }, {
    sequelize,
    modelName: 'ActivityParticipant',
    validate: {
      oneNull() {
        if (this.grantId && this.nonGranteeId) {
          throw new Error('Can not specify both grantId and nonGranteeId');
        }
      },
    },
  });
  return ActivityParticipant;
};
