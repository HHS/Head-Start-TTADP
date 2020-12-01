const {
  Model,
} = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Goal extends Model {
    static associate(models) {
      Goal.belongsToMany(models.Topic, { through: models.TopicGoal, foreignKey: 'goalId', as: 'topics' });
      // Goal.hasMany(models.Ttaplan, { foreignKey: 'goalId', as: 'ttaplans' });
      Goal.belongsToMany(models.Grantee, { through: models.Ttaplan, foreignKey: 'goalId', as: 'grantees' });
    }
  }
  Goal.init({
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Goal',
  });
  return Goal;
};
