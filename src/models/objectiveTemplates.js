const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class ObjectiveTemplate extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      ObjectiveTemplate.belongsToMany(models.Objective, { foreignKey: 'objectiveTemplateId' });
      ObjectiveTemplate.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: +'goalTemplates', onDelete: 'cascade' });
    }
  }
  ObjectiveTemplate.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    templateTitle: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'goalTemplates',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
    },
  }, {
    sequelize,
    modelName: 'ObjectiveTemplate',
  });
  return ObjectiveTemplate;
};
