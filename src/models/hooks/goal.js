const { Op } = require('sequelize');
const {
  GOAL_STATUS,
  GOAL_COLLABORATORS,
  OBJECTIVE_STATUS,
  CREATION_METHOD,
} = require('../../constants');
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
  return { id: goalTemplate[0].id, name, creationMethod: goalTemplate[0].creationMethod };
};

const checkForCuratedGoal = async (sequelize, instance) => {
  const curatedTemplate = await sequelize.models.GoalTemplate.findOne({
    where: {
      hash: sequelize.fn('md5', sequelize.fn('NULLIF', sequelize.fn('TRIM', instance.name), '')),
      creationMethod: CREATION_METHOD.CURATED,
      regionId: null,
    },
    attributes: ['id'],
  });

  if (curatedTemplate) {
    instance.set('goalTemplateId', curatedTemplate.id);
  }
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

    const similarityGroups = await sequelize.models.GoalSimilarityGroup.findAll({
      attributes: ['recipientId', 'id'],
      include: [
        {
          model: sequelize.models.Goal,
          as: 'goals',
          attributes: ['id'],
          required: true,
          where: {
            id: goalId,
          },
        },
      ],
      transaction: options.transaction,
    });

    if (similarityGroups.length === 0) return;

    const groupIds = similarityGroups.map((group) => group.id);

    await sequelize.models.GoalSimilarityGroupGoal.destroy({
      where: {
        goalSimilarityGroupId: groupIds,
      },
      transaction: options.transaction,
    });

    await sequelize.models.GoalSimilarityGroup.destroy({
      where: {
        id: groupIds,
        userHasInvalidated: false,
        finalGoalId: null,
      },
      transaction: options.transaction,
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
    transaction: options.transaction,
  });

  if (groups.length === 0) return;

  await sequelize.models.GoalSimilarityGroupGoal.destroy({
    where: {
      goalSimilarityGroupId: groups.map((group) => group.id),
    },
    transaction: options.transaction,
  });

  await sequelize.models.GoalSimilarityGroup.destroy({
    where: {
      recipientId: recipient.id,
      userHasInvalidated: false,
      finalGoalId: null,
    },
    transaction: options.transaction,
  });
};

/**
 * This is really similar to propagateName, but for EventReportPilot.
 */
const updateTrainingReportGoalText = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('name')) {
    const { id: goalId } = instance;

    const events = await sequelize.models.EventReportPilot.findAll({
      where: {
        [Op.and]: [
          {
            data: {
              [Op.contains]: { goals: [{ goalId: instance.id }] },
            },
          },
          {
            data: {
              status: {
                [Op.or]: ['In progress', 'Not started'],
              },
            },
          },
        ],
      },
    });

    // For each Event, update the `goal` property on the jsonb data blob.
    await Promise.all(events.map(async (event) => {
      const ev = event;

      const { data } = ev;
      const { goals } = data;
      const goalIndex = goals.findIndex((g) => g.goalId === goalId);

      if (goalIndex !== -1) {
        ev.data.goal = instance.name;
      }

      await sequelize.models.EventReportPilot.update(
        { data },
        { where: { id: ev.id } },
      );
    }));
  }
};

const preventCloseIfObjectivesOpen = async (sequelize, instance) => {
  const changed = instance.changed();
  const NO_GOOD_STATUSES = [GOAL_STATUS.CLOSED, GOAL_STATUS.SUSPENDED];
  if (Array.isArray(changed)
    && changed.includes('status')
    && NO_GOOD_STATUSES.includes(instance.status)) {
    const objectives = await sequelize.models.Objective.findAll({
      where: {
        goalId: instance.id,
        status: {
          [Op.not]: [OBJECTIVE_STATUS.COMPLETE, OBJECTIVE_STATUS.SUSPENDED],
        },
      },
    });

    if (objectives.length > 0) {
      throw new Error('Cannot close a goal with open objectives.');
    }
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
  preventNameChangeWhenOnApprovedAR(sequelize, instance, options);
};

const beforeCreate = async (sequelize, instance, options) => {
  await checkForCuratedGoal(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  preventNameChangeWhenOnApprovedAR(sequelize, instance, options);
  await preventCloseIfObjectivesOpen(sequelize, instance, options);
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
  await updateTrainingReportGoalText(sequelize, instance, options);
};

export {
  processForEmbeddedResources,
  findOrCreateGoalTemplate,
  autoPopulateOnApprovedAR,
  preventNameChangeWhenOnApprovedAR,
  preventCloseIfObjectivesOpen,
  checkForCuratedGoal,
  propagateName,
  beforeValidate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
  beforeCreate,
  afterDestroy,
};
