const { Op } = require('sequelize');
const {
  GOAL_STATUS,
  GOAL_COLLABORATORS,
  OBJECTIVE_STATUS,
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

const preventPreStandardEditing = async (_sequelize, instance) => {
  const isPreStandard = !!(instance.prestandard);

  if (isPreStandard) {
    throw new Error(`Cannot edit the goal ${instance.id} because it is marked as pre-standard`);
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
};

const beforeCreate = async (sequelize, instance, options) => {
};

const beforeUpdate = async (sequelize, instance, _options) => {
  await preventPreStandardEditing(sequelize, instance);
};

/**
 * Creates a GoalStatusChange record for the initial status of a goal
 * This ensures the creation event is always included in status history
 */
const createInitialStatusChange = async (sequelize, instance, options) => {
  if (!instance.id) {
    // If the instance does not have an ID, it means it has not been created yet.
    // We should not create a status change for a goal that does not exist.
    return;
  }
  // get the creator collaborator type
  const creatorType = await sequelize.models.CollaboratorType.findOne({
    where: { name: GOAL_COLLABORATORS.CREATOR },
    transaction: options.transaction,
  });

  // get the creator collaborator for this goal
  const goalCollaborator = creatorType ? await sequelize.models.GoalCollaborator.findOne({
    where: {
      goalId: instance.id,
      collaboratorTypeId: creatorType.id,
    },
    include: [
      {
        model: sequelize.models.User,
        as: 'user',
        attributes: ['id', 'name'],
      },
    ],
    transaction: options.transaction,
  }) : null;

  // create a GoalStatusChange record for the initial status
  await sequelize.models.GoalStatusChange.create({
    goalId: instance.id,
    userId: goalCollaborator?.userId || options.userId || null,
    userName: goalCollaborator?.user?.name || null,
    oldStatus: null,
    newStatus: instance.status || 'Not Started',
    reason: 'Goal created',
    context: 'Creation',
  }, {
    transaction: options.transaction,
  });
};

const afterCreate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
  await autoPopulateCreator(sequelize, instance, options);
  await createInitialStatusChange(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await processForEmbeddedResources(sequelize, instance, options);
  await autoPopulateEditor(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await updateTrainingReportGoalText(sequelize, instance, options);
};

export {
  processForEmbeddedResources,
  autoPopulateOnApprovedAR,
  createInitialStatusChange,
  beforeValidate,
  beforeUpdate,
  afterCreate,
  afterUpdate,
  beforeCreate,
  afterDestroy,
};
