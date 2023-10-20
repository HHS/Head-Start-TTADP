const { Model } = require('sequelize');
const {
  beforeValidate,
  beforeUpdate,
  beforeDestroy,
  afterUpdate,
} = require('./hooks/goalFieldResponse');

export default (sequelize, DataTypes) => {
  class GoalFieldResponse extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      GoalFieldResponse.belongsTo(models.Goal, { foreignKey: 'goalId', onDelete: 'cascade', as: 'goal' });
      GoalFieldResponse.belongsTo(models.GoalTemplateFieldPrompt, { foreignKey: 'goalTemplateFieldPromptId', as: 'prompt' });
    }
  }
  GoalFieldResponse.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    goalId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'Goals' }, key: 'id' },
    },
    goalTemplateFieldPromptId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'GoalTemplateFieldPrompts' }, key: 'id' },
    },
    response: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    onAR: {
      type: DataTypes.BOOLEAN,
      // defaultValue: false, // TODO: needs to be fixed in migration
      allowNull: false,
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
      // defaultValue: false, // TODO: needs to be fixed in migration
      allowNull: false,
    },
    isFoiaable: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    isReferenced: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  }, {
    sequelize,
    modelName: 'GoalFieldResponse',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
      afterUpdate: async (instance, options) => afterUpdate(sequelize, instance, options),
    },
  });
  return GoalFieldResponse;
};
