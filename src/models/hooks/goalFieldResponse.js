import {
  checkForAttemptToChangeFoiaableValue,
  checkForAttemptToRemoveFoiaableValue,
  autoPopulateIsFlagged,
} from '../helpers/isFlagged';

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateIsFlagged('onAR', instance, options);
  autoPopulateIsFlagged('onApprovedAR', instance, options);
  autoPopulateIsFlagged('isFoiaable', instance, options);
  autoPopulateIsFlagged('isReferenced', instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForAttemptToRemoveFoiaableValue(sequelize, instance, options);
};

const syncActivityReportGoalFieldResponses = async (sequelize, instance, options) => {
  if (instance.onApprovedAR === false) {
    const changed = instance.changed();
    if (instance.id !== null
    && Array.isArray(changed)
    && changed.includes('response')) {
      // Update all ActivityReportGoalFieldResponses with this goalId and promptId.
      const { goalId, goalTemplateFieldPromptId } = instance;
      await sequelize.models.ActivityReportGoalFieldResponse.update(
        { response: instance.response },
        {
          where: {
            goalTemplateFieldPromptId,
          },
          includes: {
            model: sequelize.models.ActivityReportGoal,
            where: {
              goalId,
            },
          },

        },
      );
    }
  }
};

const afterUpdate = async (sequelize, instance, options) => {
  await syncActivityReportGoalFieldResponses(sequelize, instance, options);
};

export {
  beforeValidate,
  beforeUpdate,
  beforeDestroy,
  afterUpdate,
};
