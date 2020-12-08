import { Model } from 'sequelize';

export default (sequelize) => {
  class ActivityCollaborator extends Model {
    static associate(models) {
      ActivityCollaborator.belongsTo(models.Activity, { foreignKey: 'activityId' });
      ActivityCollaborator.belongsTo(models.User, { foreignKey: 'userId' });
    }
  }
  ActivityCollaborator.init({}, {
    sequelize,
    modelName: 'ActivityCollaborator',
  });
  return ActivityCollaborator;
};
