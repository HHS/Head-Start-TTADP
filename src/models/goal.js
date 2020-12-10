const {
  Model,
} = require('sequelize');

/**
 * Goals table. Stores goals for tta.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Goal extends Model {
    static associate(models) {
      Goal.belongsToMany(models.Topic, { through: models.TopicGoal, foreignKey: 'goalId', as: 'topics' });
      Goal.belongsToMany(models.Grantee, { through: models.GrantGoal, foreignKey: 'goalId', as: 'grantees' });
    }
  }
  Goal.init({
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.STRING,
    isFromSmartsheetTtaPlan: DataTypes.BOOLEAN,
  }, {
    sequelize,
    modelName: 'Goal',
  });
  return Goal;
};
