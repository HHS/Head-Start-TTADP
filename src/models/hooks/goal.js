import httpContext from 'express-http-context';
import {
  GOAL_STATUS,
  ENTITY_TYPES,
  COLLABORATOR_TYPES,
} from '../../constants';
import { upsertCollaborator } from '../../services/collaborators';

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
  return goalTemplate[0].id;
};

// const autoPopulateGoalTemplateId = async (sequelize, instance, options) => {
//   if (instance.goalTemplateId === undefined
//   || instance.goalTemplateId === null) {
//     const grant = await sequelize.models.Grant.findOne({
//       attributes: ['regionId'],
//       where: { id: instance.grantId },
//       transaction: options.transaction,
//       include: false,
//     });
//     const templateId = await findOrCreateGoalTemplate(
//       sequelize,
//       options,
//       grant.regionId,
//       instance.name,
//       instance.createdAt,
//     );
//     instance.set('goalTemplateId', templateId);
//   }
// };

const autoPopulateOnApprovedAR = (sequelize, instance) => {
  if (instance.onApprovedAR === undefined
    || instance.onApprovedAR === null) {
    instance.set('onApprovedAR', false);
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

const autoPopulateStatusChangeDates = (sequelize, instance) => {
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
        }
        instance.set('lastNotStartedAt', now);
        break;
      case GOAL_STATUS.IN_PROGRESS:
        if (instance.firstInProgressAt === null
          || instance.firstInProgressAt === undefined) {
          instance.set('firstInProgressAt', now);
        }
        instance.set('lastInProgressAt', now);
        break;
      case GOAL_STATUS.SUSPENDED:
        if (instance.firstSuspendedAt === null
          || instance.firstSuspendedAt === undefined) {
          instance.set('firstSuspendedAt', now);
        }
        instance.set('lastSuspendedAt', now);
        break;
      case GOAL_STATUS.CLOSED:
        if (instance.firstClosedAt === null
          || instance.firstClosedAt === undefined) {
          instance.set('firstClosedAt', now);
        }
        instance.set('lastClosedAt', now);
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

const autoPopulateCollaborators = async (sequelize, instance, options, collaboratorTypes) => {
  const loggedUser = httpContext.get('loggedUser') ? Number(httpContext.get('loggedUser')) : undefined;
  if (loggedUser && typeof loggedUser === 'number') {
    await upsertCollaborator({
      entytyType: ENTITY_TYPES.GOAL,
      entityId: instance.id,
      collaboratorTypes,
      userId: loggedUser,
      tier: 1,
    });
  }
};

const beforeValidate = async (sequelize, instance) => {
  // await autoPopulateGoalTemplateId(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance);
  preventNamChangeWhenOnApprovedAR(sequelize, instance);
  autoPopulateStatusChangeDates(sequelize, instance);
};

const afterCreate = async (sequelize, instance, options) => {
  await autoPopulateCollaborators(
    sequelize,
    instance,
    options,
    [COLLABORATOR_TYPES.OWNER, COLLABORATOR_TYPES.INSTANTIATOR],
  );
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateName(sequelize, instance, options);
  await autoPopulateCollaborators(
    sequelize,
    instance,
    options,
    [COLLABORATOR_TYPES.EDITOR],
  );
};

export {
  findOrCreateGoalTemplate,
  // autoPopulateGoalTemplateId,
  autoPopulateOnApprovedAR,
  preventNamChangeWhenOnApprovedAR,
  autoPopulateStatusChangeDates,
  autoPopulateCollaborators,
  propagateName,
  beforeValidate,
  afterCreate,
  afterUpdate,
};
