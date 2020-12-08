import { Model } from 'sequelize';

export default (sequelize) => {
  class ActivityParticipant extends Model {
    static associate(models) {
      ActivityParticipant.belongsTo(models.Activity, { foreignKey: 'activityId' });
      ActivityParticipant.belongsTo(models.Grant, { foreignKey: 'grantId' });
      ActivityParticipant.belongsTo(models.NonGrantee, { foreignKey: 'nonGranteeId' });
    }
  }
  ActivityParticipant.init({}, {
    sequelize,
    modelName: 'ActivityParticipant',
    validate: {
      oneNull() {
        if (![this.grantId, this.nonGranteeId].includes(null)) {
          throw new Error('Can not specify both grantId and nonGranteeId');
        }
      },
    },
  });
  return ActivityParticipant;
};
