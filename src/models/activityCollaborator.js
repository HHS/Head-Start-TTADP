import { Model } from 'sequelize';

export default (sequelize, DataTypes) => {
  class ActivityCollaborator extends Model {
    static associate(models) {
      ActivityCollaborator.belongsTo(models.Activity, { foreignKey: 'activityId'});
      ActivityCollaborator.belongsTo(models.User, { foreignKey: 'userId'});
    }
  }
  ActivityCollaborator.init();
  return ActivityCollaborator;
};
