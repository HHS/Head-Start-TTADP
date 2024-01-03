const { Op } = require('sequelize');
const { GOAL_STATUS, GOAL_COLLABORATORS } = require('../../constants');
const {
  currentUserPopulateCollaboratorForType,
} = require('../helpers/genericCollaborator');
const { skipIf } = require('../helpers/flowControl');

const processForEmbeddedResources = async (_sequelize, instance) => {
  // eslint-disable-next-line global-require
  const { calculateIsAutoDetectedForGoal, processGoalForResourcesById } = require('../../services/resource');
  const changed = instance.changed() || Object.keys(instance);
  if (calculateIsAutoDetectedForGoal(changed)) {
    await processGoalForResourcesById(instance.id);
  }
};

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

const autoPopulateOnAR = (_sequelize, instance, options) => {
  if (instance.onAR === undefined
    || instance.onAR === null) {
    instance.set('onAR', false);
    if (!options.fields.includes('onAR')) {
      options.fields.push('onAR');
    }
  }
};

const autoPopulateOnApprovedAR = (_sequelize, instance, options) => {
  if (instance.onApprovedAR === undefined
    || instance.onApprovedAR === null) {
    instance.set('onApprovedAR', false);
    if (!options.fields.includes('onApprovedAR')) {
      options.fields.push('onApprovedAR');
    }
  }
};

const preventNameChangeWhenOnApprovedAR = (_sequelize, instance) => {
  if (instance.onApprovedAR === true) {
    const changed = instance.changed();
    if (instance.id !== null
      && Array.isArray(changed)
      && changed.includes('name')) {
      throw new Error('Goal name change not allowed for goals on approved activity reports.');
    }
  }
};

const invalidateSimilarityScores = async (sequelize, instance, options) => {
  const changed = Array.from(instance.changed());

  if (changed.includes('name')) {
    await sequelize.models.SimScoreGoalCache.destroy({
      where: {
        [Op.or]: [
          { goal1: instance.id },
          { goal2: instance.id },
        ],
      },
      transaction: options.transaction,
    });
  }
};

const autoPopulateStatusChangeDates = (_sequelize, instance, options) => {
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

const autoPopulateCreator = async (sequelize, instance, options) => {
  if (skipIf(options, 'autoPopulateCreator')) return Promise.resolve();
  const { id: goalId } = instance;
  return currentUserPopulateCollaboratorForType(
    'goal',
    sequelize,
    options.transaction,
    goalId,
    GOAL_COLLABORATORS.CREATOR,
  );
};

const autoPopulateEditor = async (sequelize, instance, options) => {
  const { id: goalId } = instance;
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('name')
    && instance.previous('name') !== instance.name) {
    return currentUserPopulateCollaboratorForType(
      'goal',
      sequelize,
      options.transaction,
      goalId,
      GOAL_COLLABORATORS.EDITOR,
    );
  }
  return Promise.resolve();
};

const invalidateGoalSimilarityGroupsOnUpdate = async (sequelize, instance, options) => {
  const changed = Array.from(instance.changed());

  if (changed.includes('name')) {
    const { id: goalId } = instance;

    if (!goalId) return;

    const similarityGroup = await sequelize.models.GoalSimilarityGroup.findOne({
      attributes: ['recipientId', 'goals'],
      where: {
        goals: {
          [Op.contains]: [goalId],
        },
      },
      transaction: options.transaction,
    });

    if (!similarityGroup) return;

    await sequelize.models.GoalSimilarityGroup.destroy({
      where: {
        recipientId: similarityGroup.recipientId,
        userHasInvalidated: false,
        finalGoalId: null,
      },
    });
  }
};

const invalidateSimilarityGroupsOnCreationOrDestruction = async (sequelize, instance, options) => {
  const { grantId } = instance;

  if (!grantId) return;

  const recipient = await sequelize.models.Recipient.findOne({
    attributes: ['id'],
    include: [
      {
        model: sequelize.models.Grant,
        as: 'grants',
        attributes: ['id'],
        required: true,
        where: {
          id: grantId,
        },
      },
    ],
    transaction: options.transaction,
  });

  if (!recipient) return;

  const groups = await sequelize.models.GoalSimilarityGroup.findAll({
    where: {
      recipientId: recipient.id,
      userHasInvalidated: false,
      finalGoalId: null,
    },
  });

  if (groups.length === 0) return;

  await sequelize.models.GoalSimilarityGroupGoal.destroy({
    where: {
      goalSimilarityGroupId: groups.map((group) => group.id),
    },
  });

  await sequelize.models.GoalSimilarityGroup.destroy({
    where: {
      recipientId: recipient.id,
      userHasInvalidated: false,
      finalGoalId: null,
    },
  });
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
  preventNameChangeWhenOnApprovedAR(sequelize, instance, options);
  autoPopulateStatusChangeDates(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  preventNameChangeWhenOnApprovedAR(sequelize, instance, options);
  autoPopulateStatusChangeDates(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
  await autoPopulateCreator(sequelize, instance, options);
  await invalidateSimilarityGroupsOnCreationOrDestruction(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateName(sequelize, instance, options);
  await processForEmbeddedResources(sequelize, instance, options);
  await invalidateSimilarityScores(sequelize, instance, options);
  await autoPopulateEditor(sequelize, instance, options);
  await invalidateGoalSimilarityGroupsOnUpdate(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await invalidateSimilarityGroupsOnCreationOrDestruction(sequelize, instance, options);
};

export {
  processForEmbeddedResources,
  findOrCreateGoalTemplate,
  autoPopulateOnApprovedAR,
  preventNameChangeWhenOnApprovedAR,
  autoPopulateStatusChangeDates,
  propagateName,
  beforeValidate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
  afterDestroy,
};
