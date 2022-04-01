const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class GoalTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveResource.belongsToMany(models.Goal, { foreignKey: 'goalTemplateId' });
    }
  }
  ObjectiveResource.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    templateName: {
      type: DataTypes.STRING,
      allowNull: false,
    },
  }, {
    sequelize,
    modelName: 'GoalTemplate',
  });
  return GoalTemplate;
};
