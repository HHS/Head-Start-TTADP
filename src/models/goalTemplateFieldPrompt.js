const { Model } = require('sequelize');
const { PROMPT_FIELD_TYPE } = require('../constants');
const {
  beforeValidate,
  beforeUpdate,
  beforeDestroy,
} = require('./hooks/goalTemplateFieldPrompt');

export default (sequelize, DataTypes) => {
  class GoalTemplateFieldPrompt extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      GoalTemplateFieldPrompt.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', onDelete: 'cascade', as: 'goalTemplate' });
      GoalTemplateFieldPrompt.hasMany(models.GoalFieldResponse, { foreignKey: 'goalTemplateFieldPromptId', as: 'responses' });
      GoalTemplateFieldPrompt.hasMany(models.ActivityReportGoalFieldResponse, { foreignKey: 'goalTemplateFieldPromptId', as: 'reportResponses' });
      GoalTemplateFieldPrompt.belongsToMany(models.Goal, {
        through: models.GoalFieldResponse,
        foreignKey: 'goalTemplateFieldPromptId',
        otherKey: 'goalId',
        as: 'goals',
      });
    }
  }
  GoalTemplateFieldPrompt.init({
    id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      autoIncrement: true,
      primaryKey: true,
    },
    caution: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    hint: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    goalTemplateId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: { model: { tableName: 'GoalTemplates' }, key: 'id' },
    },
    ordinal: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    title: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    prompt: {
      type: DataTypes.TEXT,
      allowNull: false,
    },
    fieldType: {
      type: DataTypes.ENUM(Object.values(PROMPT_FIELD_TYPE)),
    },
    options: {
      type: DataTypes.ARRAY(DataTypes.TEXT),
      allowNull: true,
    },
    validations: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    isRequired: {
      type: new DataTypes.VIRTUAL(DataTypes.BOOLEAN, ['validations']),
      get() {
        const validations = this.get('validations');
        return validations && validations.required;
      },
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
    modelName: 'GoalTemplateFieldPrompt',
    hooks: {
      beforeValidate: async (instance, options) => beforeValidate(sequelize, instance, options),
      beforeUpdate: async (instance, options) => beforeUpdate(sequelize, instance, options),
      beforeDestroy: async (instance, options) => beforeDestroy(sequelize, instance, options),
    },
  });
  return GoalTemplateFieldPrompt;
};
