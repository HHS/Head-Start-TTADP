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
      Goal.belongsToMany(models.Recipient, { through: models.GrantGoal, foreignKey: 'goalId', as: 'recipients' });
      Goal.belongsToMany(models.Grant, { through: models.GrantGoal, foreignKey: 'goalId', as: 'grants' });
      Goal.hasMany(models.Objective, { foreignKey: 'goalId', as: 'objectives' });
    }
  }
  Goal.init({
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.STRING,
    isFromSmartsheetTtaPlan: DataTypes.BOOLEAN,
    goalNumber: {
      type: DataTypes.VIRTUAL,
      get() {
        const { id, grants } = this;
        let regionId = 0;
        if (grants && grants.length > 0) {
          regionId = grants[0].regionId;
        }
        return `R${regionId}-G-${id}`;
      },
    },
  }, {
    sequelize,
    modelName: 'Goal',
  });
  return Goal;
};
