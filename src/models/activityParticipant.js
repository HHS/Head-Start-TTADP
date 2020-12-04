import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ActivityParticipant extends Model {
    static associate(models) {
      ActivityParticipant.belongsTo(models.Activity, { foreignKey: 'activityId'});
      ActivityParticipant.belongsTo(models.Grant, { foreignKey: 'grantId'});
      ActivityParticipant.belongsTo(models.NonGrantee, { foreignKey: 'nonGranteeId'});
    }
  }
  ActivityParticipant.init();
  return ActivityParticipant;
};
