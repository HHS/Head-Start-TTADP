const findOrCreateObjectiveTemplate = async (
  sequelize,
  transaction,
  regionId,
  title,
  createdAt,
) => {
  const objectiveTemplate = await sequelize.models.ObjectiveTemplate.findOrCreate({
    where: {
      hash: sequelize.fn('md5', sequelize.fn('NULLIF', sequelize.fn('TRIM', title), '')),
      regionId,
    },
    defaults: {
      templateTitle: title,
      lastUsed: createdAt,
      regionId,
      creationMethod: 'Automatic',
    },
    transaction,
  });
  return objectiveTemplate[0].id;
};

const autoPopulateOnApprovedAR = (sequelize, instance) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.onApprovedAR === undefined
    || instance.onApprovedAR === null) {
    instance.set('onApprovedAR', false);
  }
};

const preventTitleChangeWhenOnApprovedAR = (sequelize, instance) => {
  if (instance.onApprovedAR === true) {
    const changed = instance.changed();
    if (instance.id !== null
        && Array.isArray(changed)
        && changed.includes('title')) {
      throw new Error('Objective title change not allowed for objectives on approved activity reports.');
    }
  }
};

const autoPopulateStatusChangeDates = (sequelize, instance) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('status')) {
    const now = new Date();
    switch (instance.status) {
      case 'Draft':
        break;
      case 'Not Started':
        if (instance.firstNotStartedAt === null
          || instance.firstNotStartedAt === undefined) {
          instance.set('firstNotStartedAt', now);
        }
        instance.set('lastNotStartedAt', now);
        break;
      case 'In Progress':
        if (instance.firstInProgressAt === null
          || instance.firstInProgressAt === undefined) {
          instance.set('firstInProgressAt', now);
        }
        instance.set('lastInProgressAt', now);
        break;
      case 'Suspended':
        if (instance.firstSuspendedAt === null
          || instance.firstSuspendedAt === undefined) {
          instance.set('firstSuspendedAt', now);
        }
        instance.set('lastSuspendedAt', now);
        break;
      case 'Completed':
        if (instance.firstCompleteAt === null
          || instance.firstCompleteAt === undefined) {
          instance.set('firstCompleteAt', now);
        }
        instance.set('lastCompleteAt', now);
        break;
      default:
        throw new Error(`Objective status changed to invalid value of "${instance.status}".`);
    }
  }
};

const linkObjectiveGoalTemplates = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (instance.goalId !== undefined
    && instance.goalId !== null
    && instance.objectiveTemplateId !== undefined
    && instance.objectiveTemplateId !== null
    && Array.isArray(changed) && changed.includes('objectiveTemplateId')) {
    const goal = await sequelize.models.Goal.findOne({
      attributes: ['goalTemplateId'],
      where: { id: instance.goalId },
      transaction: options.transaction,
    });
    const [gtot] = await sequelize.models.GoalTemplateObjectiveTemplate.findOrCreate({
      where: {
        goalTemplateId: goal.goalTemplateId,
        objectiveTemplateId: instance.objectiveTemplateId,
      },
      defaults: {
        goalTemplateId: goal.goalTemplateId,
        objectiveTemplateId: instance.objectiveTemplateId,
      },
      transaction: options.transaction,
    });
    await sequelize.models.GoalTemplateObjectiveTemplate.update(
      {
        updatedAt: new Date(),
      },
      {
        where: { id: gtot.id },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
  }
};

const propogateStatusToParentGoal = async (sequelize, instance, options) => {
  const { goalId } = instance;

  // some objectives will not have a goalId, they will be attached to an otherentity instead
  if (goalId) {
    // we need to get the goal, but we'll only be moving it from "not started" to "in progress"
    // movement from draft is handled by the create goals form and the activity report hooks
    const goal = await sequelize.models.Goal.findOne({
      where: {
        id: goalId,
        status: 'Not Started',
      },
      transaction: options.transaction,
    });

    // because of that, there may not be a goal to update
    if (goal) {
      const objectives = await sequelize.models.Objective.findAll({
        where: {
          goalId,
        },
      });

      // if there is, we then need to check to see if it needs to be moved to "in progress"
      const atLeastOneInProgress = objectives.some((o) => o.status === 'In Progress');

      // and if so, we update it (storing the previous status so we can revert if needed)
      if (atLeastOneInProgress) {
        await goal.update({
          status: 'In Progress',
          previousStatus: 'Not Started',
        }, {
          transaction: options.transaction,
        });
      }
    }
  }
};

const propagateTitle = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('title') && instance.goalTemplateId) {
    await sequelize.models.ObjectiveTemplate.update(
      {
        hash: sequelize.fn('md5', sequelize.fn('NULLIF', sequelize.fn('TRIM', instance.title), '')),
        templateTitle: instance.title,
      },
      {
        where: {
          id: instance.goalTemplateId,
        },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
  }
};

const propagateMetadataToTemplate = async (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('objectiveTemplateId')) {
    const files = await sequelize.models.ObjectiveFile.findAll({
      where: { objectiveId: instance.id },
      transaction: options.transaction,
    });
    await Promise.all(files.map(async (file) => sequelize.models.ObjectiveTemplateFile
      .findOrCreate({
        where: {
          objectiveTemplateId: instance.objectiveTemplateId,
          fileid: file.fileId,
        },
      })));

    const resources = await sequelize.models.ObjectiveResource.findAll({
      where: { objectiveId: instance.id },
      transaction: options.transaction,
    });
    await Promise.all(resources.map(async (resource) => sequelize.models.ObjectiveTemplateResource
      .findOrCreate({
        where: {
          objectiveTemplateId: instance.objectiveTemplateId,
          userProvidedUrl: resource.userProvidedUrl,
        },
      })));

    const rolls = await sequelize.models.ObjectiveRole.findAll({
      where: { objectiveId: instance.id },
      transaction: options.transaction,
    });
    await Promise.all(rolls.map(async (roll) => sequelize.models.ObjectiveTemplateRole
      .findOrCreate({
        where: {
          objectiveTemplateId: instance.objectiveTemplateId,
          rollId: roll.rollId,
        },
      })));

    const topics = await sequelize.models.ObjectiveTopics.findAll({
      where: { objectiveId: instance.id },
      transaction: options.transaction,
    });
    await Promise.all(topics.map(async (topic) => sequelize.models.ObjectiveTemplateTopics
      .findOrCreate({
        where: {
          objectiveTemplateId: instance.objectiveTemplateId,
          topicId: topic.topicId,
        },
      })));
  }
};

const beforeValidate = async (sequelize, instance) => {
  // await autoPopulateObjectiveTemplateId(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance);
  preventTitleChangeWhenOnApprovedAR(sequelize, instance);
  autoPopulateStatusChangeDates(sequelize, instance);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateTitle(sequelize, instance, options);
  await propagateMetadataToTemplate(sequelize, instance, options);
  await linkObjectiveGoalTemplates(sequelize, instance, options);
  await propogateStatusToParentGoal(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await propogateStatusToParentGoal(sequelize, instance, options);
};

export {
  findOrCreateObjectiveTemplate,
  // autoPopulateObjectiveTemplateId,
  autoPopulateOnApprovedAR,
  preventTitleChangeWhenOnApprovedAR,
  linkObjectiveGoalTemplates,
  propagateTitle,
  beforeValidate,
  afterUpdate,
  afterCreate,
};
