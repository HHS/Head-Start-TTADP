import { GOAL_STATUS } from '../../constants';

const findOrCreateGoalTemplate = async (sequelize, transaction, regionId, name, createdAt) => {
  const goalTemplate = await sequelize.models.GoalTemplate.findOrCreate({
    where: {
      hash: sequelize.fn('md5', sequelize.fn('NULLIF', sequelize.fn('TRIM', name), '')),
      regionId,
    },
    defaults: {
      templateName: name,
      lastUsed: createdAt,
      regionId,
      creationMethod: 'Automatic',
    },
    transaction,
  });
  return { id: goalTemplate[0].id, name };
};

const autoPopulateOnAR = (sequelize, instance, options) => {
  if (instance.onAR === undefined
    || instance.onAR === null) {
    instance.set('onAR', false);
    if (!options.fields.includes('onAR')) {
      options.fields.push('onAR');
    }
  }
};

const autoPopulateOnApprovedAR = (sequelize, instance, options) => {
  if (instance.onApprovedAR === undefined
    || instance.onApprovedAR === null) {
    instance.set('onApprovedAR', false);
    if (!options.fields.includes('onApprovedAR')) {
      options.fields.push('onApprovedAR');
    }
  }
};

const preventNamChangeWhenOnApprovedAR = (sequelize, instance) => {
  if (instance.onApprovedAR === true) {
    const changed = instance.changed();
    if (instance.id !== null
      && Array.isArray(changed)
      && changed.includes('name')) {
      throw new Error('Goal name change not allowed for goals on approved activity reports.');
    }
  }
};

const autoPopulateStatusChangeDates = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('status')) {
    const now = new Date();
    const { status } = instance;
    switch (status) {
      case undefined:
      case null:
      case '':
      case GOAL_STATUS.DRAFT:
        break;
      case GOAL_STATUS.NOT_STARTED:
        if (instance.firstNotStartedAt === null
          || instance.firstNotStartedAt === undefined) {
          instance.set('firstNotStartedAt', now);
          if (!options.fields.includes('firstNotStartedAt')) {
            options.fields.push('firstNotStartedAt');
          }
        }
        instance.set('lastNotStartedAt', now);
        if (!options.fields.includes('lastNotStartedAt')) {
          options.fields.push('lastNotStartedAt');
        }
        break;
      case GOAL_STATUS.IN_PROGRESS:
        if (instance.firstInProgressAt === null
          || instance.firstInProgressAt === undefined) {
          instance.set('firstInProgressAt', now);
          if (!options.fields.includes('firstInProgressAt')) {
            options.fields.push('firstInProgressAt');
          }
        }
        instance.set('lastInProgressAt', now);
        if (!options.fields.includes('lastInProgressAt')) {
          options.fields.push('lastInProgressAt');
        }
        break;
      case GOAL_STATUS.SUSPENDED:
        if (instance.firstCeasedSuspendedAt === null
          || instance.firstCeasedSuspendedAt === undefined) {
          instance.set('firstCeasedSuspendedAt', now);
          if (!options.fields.includes('firstCeasedSuspendedAt')) {
            options.fields.push('firstCeasedSuspendedAt');
          }
        }
        instance.set('lastCeasedSuspendedAt', now);
        if (!options.fields.includes('lastCeasedSuspendedAt')) {
          options.fields.push('lastCeasedSuspendedAt');
        }
        break;
      case GOAL_STATUS.CLOSED:
        if (instance.firstClosedAt === null
          || instance.firstClosedAt === undefined) {
          instance.set('firstClosedAt', now);
          if (!options.fields.includes('firstClosedAt')) {
            options.fields.push('firstClosedAt');
          }
        }
        instance.set('lastClosedAt', now);
        if (!options.fields.includes('lastClosedAt')) {
          options.fields.push('lastClosedAt');
        }
        break;
      default:
        throw new Error(`Goal status changed to invalid value of "${status}".`);
    }
  }
};

const propagateName = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('name')
    && instance.goalTemplateId !== null
    && instance.goalTemplateId !== undefined) {
    await sequelize.models.GoalTemplate.update(
      { templateName: instance.name },
      {
        where: { id: instance.goalTemplateId },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  // await autoPopulateGoalTemplateId(sequelize, instance, options);
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
  preventNamChangeWhenOnApprovedAR(sequelize, instance, options);
  autoPopulateStatusChangeDates(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  preventNamChangeWhenOnApprovedAR(sequelize, instance, options);
  autoPopulateStatusChangeDates(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateName(sequelize, instance, options);
};

export {
  findOrCreateGoalTemplate,
  // autoPopulateGoalTemplateId,
  autoPopulateOnApprovedAR,
  preventNamChangeWhenOnApprovedAR,
  autoPopulateStatusChangeDates,
  propagateName,
  beforeValidate,
  beforeUpdate,
  afterUpdate,
};
