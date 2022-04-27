const {
  Model,
} = require('sequelize');
const { CLOSE_SUSPEND_REASONS } = require('../constants');
const { formatDate } = require('../lib/modelHelpers');
// const { auditLogger } = require('../logger');

/**
 * Goals table. Stores goals for tta.
 *
 * @param {} sequelize
 * @param {*} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class Goal extends Model {
    static associate(models) {
      Goal.belongsToMany(models.ActivityReport, { through: models.ActivityReportGoal, foreignKey: 'goalId', as: 'activityReports' });
      Goal.belongsToMany(models.Topic, { through: models.TopicGoal, foreignKey: 'goalId', as: 'topics' });
      Goal.belongsToMany(models.Recipient, { through: models.GrantGoal, foreignKey: 'goalId', as: 'recipients' });
      Goal.belongsTo(models.Grant, { foreignKey: 'grantId', as: 'grants' });
      Goal.hasMany(models.Objective, { foreignKey: 'goalId', as: 'objectives' });
      // Goal.hasOne(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: +'goalTemplates' });
      Goal.belongsTo(models.GoalTemplate, { foreignKey: 'goalTemplateId', as: +'goalTemplates' });
    }
  }
  Goal.init({
    name: DataTypes.TEXT,
    status: DataTypes.STRING,
    timeframe: DataTypes.STRING,
    isFromSmartsheetTtaPlan: DataTypes.BOOLEAN,
    endDate: {
      type: DataTypes.DATEONLY,
      get: formatDate,
    },
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
    closeSuspendReason: {
      allowNull: true,
      type: DataTypes.ENUM(Object.keys(CLOSE_SUSPEND_REASONS).map((k) => CLOSE_SUSPEND_REASONS[k])),
    },
    closeSuspendContext: {
      type: DataTypes.TEXT,
    },
    grantId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: {
          tableName: 'grants',
        },
        key: 'id',
      },
      onUpdate: 'CASCADE',
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
    previousStatus: {
      type: DataTypes.STRING,
    },
    onApprovedAR: {
      type: DataTypes.BOOLEAN,
      default: false,
    },
  }, {
    sequelize,
    modelName: 'Goal',
    hooks: {
      beforeValidate: async (instance, options) => {
        // eslint-disable-next-line no-prototype-builtins
        if (!instance.hasOwnProperty('goalTemplateId')
        || instance.goalTemplateId === null
        || instance.goalTemplateId === undefined) {
          const grant = await sequelize.models.Grant.findOne({ where: { id: instance.grantId } });
          const goalTemplate = await sequelize.models.GoalTemplate.findOrCreate({
            where: { templateName: instance.name, regionId: grant.regionId },
            default: {
              templateName: instance.name,
              lastUsed: instance.createdAt,
              regionId: grant.regionId,
              creationMethod: 'Automatic',
            },
            transaction: options.transaction,
          });
          // eslint-disable-next-line no-param-reassign
          instance.goalTemplateId = goalTemplate[0].id;
        }

        // eslint-disable-next-line no-prototype-builtins
        if (!instance.hasOwnProperty('onApprovedAR')
        || instance.onApprovedAR === null
        || instance.onApprovedAR === undefined) {
          // eslint-disable-next-line no-param-reassign
          instance.onApprovedAR = false;
        }
      },
    },
  });
  return Goal;
};
