const autoPopulateOnAR = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.onAR === undefined
    || instance.onAR === null) {
    instance.set('onAR', false);
    if (!options.fields.includes('onAR')) {
      options.fields.push('onAR');
    }
  }
};

const autoPopulateOnApprovedAR = (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.onApprovedAR === undefined
    || instance.onApprovedAR === null) {
    instance.set('onApprovedAR', false);
    if (!options.fields.includes('onApprovedAR')) {
      options.fields.push('onApprovedAR');
    }
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
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
  autoPopulateOnAR,
  autoPopulateOnApprovedAR,
  beforeValidate,
  afterUpdate,
};
