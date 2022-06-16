// import { Op } from 'sequelize';
import { auditLogger } from '../../logger';

const autoPopulateObjectiveTemplateId = async (sequelize, instance, options) => {
  // eslint-disable-next-line no-prototype-builtins
  if (instance.objectiveTemplateId === undefined
  || instance.objectiveTemplateId === null) {
    let regionId = null;
    // eslint-disable-next-line no-prototype-builtins
    if (instance.hasOwnProperty('goalId')
    && instance.goalId !== null
    && instance.goalId !== undefined) {
      const goal = await sequelize.models.Goal.findOne({
        where: { id: instance.goalId },
        include: [
          {
            model: sequelize.models.Grant,
            as: 'grant',
            attributes: ['regionId'],
          },
        ],
      });
      regionId = goal.grant.regionId;
      // eslint-disable-next-line no-prototype-builtins
    } else if (instance.otherEntityId !== undefined
    && instance.otherEntityId !== null) {
      try {
        const otherEntity = await sequelize.models.OtherEntity.findAll({
          attributes: [
            [sequelize.literal('array_agg(`ActivityReports`.regionId)'), 'regionIds'],
          ],
          where: { id: instance.otherEntityId },
          include: [
            {
              model: sequelize.models.ActivityReport,
              as: 'activityReports',
              attribites: [],
            },
          ],
          group: ['id'],
        });
        if (otherEntity.regionIds.length === 1) {
          [regionId] = otherEntity.regionIds;
        }
      } catch (err) {
        auditLogger.error(JSON.stringify(err));
        throw err;
      }
    }

    const objectiveTemplate = await sequelize.models.ObjectiveTemplate.findOrCreate({
      where: { hash: sequelize.fn('md5', sequelize.fn('NULLIF', sequelize.fn('TRIM', instance.title), '')), regionId },
      defaults: {
        templateTitle: instance.title,
        lastUsed: instance.createdAt,
        regionId,
        creationMethod: 'Automatic',
      },
      transaction: options.transaction,
    });
    instance.set('objectiveTemplateId', objectiveTemplate[0].id);
  }
};

const autoPopulateOnApprovedAR = (sequelize, instance) => {
  // eslint-disable-next-line no-prototype-builtins
  if (!instance.hasOwnProperty('onApprovedAR')
  || instance.onApprovedAR === null
  || instance.onApprovedAR === undefined) {
    instance.set('onApprovedAR', false);
  }
};

const preventTitleChangeWhenOnApprovedAR = (sequelize, instance) => {
  if (instance.onApprovedAR === true) {
    const changed = instance.changed();
    if (Array.isArray(changed)
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
          && instance.firstNotStartedAt === undefined) {
          instance.set('firstNotStartedAt', now);
        }
        instance.set('lastNotStartedAt', now);
        break;
      case 'In Progress':
        if (instance.firstInProgressAt === null
          && instance.firstInProgressAt === undefined) {
          instance.set('firstInProgressAt', now);
        }
        instance.set('lastInProgressAt', now);
        break;
      case 'Suspended':
        if (instance.firstSuspendedAt === null
          && instance.firstSuspendedAt === undefined) {
          instance.set('firstSuspendedAt', now);
        }
        instance.set('lastSuspendedAt', now);
        break;
      case 'Completed':
        if (instance.firstCompleteAt === null
          && instance.firstCompleteAt === undefined) {
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
  // eslint-disable-next-line no-prototype-builtins
  if (instance.hasOwnProperty('goalId')
  && instance.goalId !== null
  && instance.goalId !== undefined) {
    const goal = await sequelize.models.Goal.findOne({
      where: { id: instance.goalId },
      transaction: options.transaction,
    });
    const gtot = await sequelize.models.GoalTemplateObjectiveTemplate.findOrCreate({
      where: {
        goalTemplateId: goal.goalTemplateId,
        objectiveTemplateId: instance.objectiveTemplateId,
      },
      defaults: {
        goalTemplateId: instance.goal.goalTemplateId,
        objectiveTemplateId: instance.objectiveTemplateId,
      },
      transaction: options.transaction,
    });
    await sequelize.models.goalTemplateObjectiveTemplate.update(
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

const propagateTitle = async (sequelize, instance, options) => {
  const changed = instance.changed();
  auditLogger.error(JSON.stringify({ changed, instance }));
  if (Array.isArray(changed) && changed.includes('title')) {
    await sequelize.models.ObjectiveTemplate.update(
      {
        hash: sequelize.fn('md5', sequelize.fn('NULLIF', sequelize.fn('TRIM', instance.title), '')),
        templateTitle: instance.title,
      },
      {
        where: { id: instance.goalTemplateId },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  await autoPopulateObjectiveTemplateId(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance);
  preventTitleChangeWhenOnApprovedAR(sequelize, instance);
  autoPopulateStatusChangeDates(sequelize, instance);
};

const afterCreate = async (sequelize, instance, options) => {
  await linkObjectiveGoalTemplates(sequelize, instance, options);
};
const afterUpdate = async (sequelize, instance, options) => {
  await propagateTitle(sequelize, instance, options);
};

export {
  autoPopulateObjectiveTemplateId,
  autoPopulateOnApprovedAR,
  preventTitleChangeWhenOnApprovedAR,
  linkObjectiveGoalTemplates,
  propagateTitle,
  beforeValidate,
  afterCreate,
  afterUpdate,
};
