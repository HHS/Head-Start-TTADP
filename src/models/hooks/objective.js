import httpContext from 'express-http-context';
import { Op } from 'sequelize';
import { REPORT_STATUSES } from '@ttahub/common';
import { OBJECTIVE_STATUS, OBJECTIVE_COLLABORATORS, GOAL_STATUS } from '../../constants';
import { validateChangedOrSetEnums } from '../helpers/enum';
import { skipIf } from '../helpers/flowControl';
import {
  currentUserPopulateCollaboratorForType,
} from '../helpers/genericCollaborator';

// Find or create templates for each of the distinct titles.
// TODO: TTAHUB-3970: We can remove this when we switch to standard goals.
// Probably we don't want to create an objective template every time.
// But have a finite list of hardcoded objective templates for each goal template.
// We need to check this with ohs. findOrCreateObjectiveTemplate().
// NOTE: Determine what to do here when we implement the objective changes.
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
  return { id: objectiveTemplate[0].id, title };
};

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

const autoPopulateStatusChangeDates = (sequelize, instance, options) => {
  const changed = instance.changed();
  if (Array.isArray(changed) && changed.includes('status')) {
    const now = new Date();
    switch (instance.status) {
      case OBJECTIVE_STATUS.DRAFT:
        break;
      case OBJECTIVE_STATUS.NOT_STARTED:
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
      case OBJECTIVE_STATUS.IN_PROGRESS:
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
      case OBJECTIVE_STATUS.SUSPENDED:
        if (instance.firstSuspendedAt === null
          || instance.firstSuspendedAt === undefined) {
          instance.set('firstSuspendedAt', now);
          if (!options.fields.includes('firstSuspendedAt')) {
            options.fields.push('firstSuspendedAt');
          }
        }
        instance.set('lastSuspendedAt', now);
        if (!options.fields.includes('lastSuspendedAt')) {
          options.fields.push('lastSuspendedAt');
        }
        break;
      case OBJECTIVE_STATUS.COMPLETE:
        if (instance.firstCompleteAt === null
          || instance.firstCompleteAt === undefined) {
          instance.set('firstCompleteAt', now);
          if (!options.fields.includes('firstCompleteAt')) {
            options.fields.push('firstCompleteAt');
          }
        }
        instance.set('lastCompleteAt', now);
        if (!options.fields.includes('lastCompleteAt')) {
          options.fields.push('lastCompleteAt');
        }
        break;
      default:
        throw new Error(`Objective status changed to invalid value of "${instance.status}".`);
    }
  }
};

// Find or create templates for each of the distinct titles.
// TODO: TTAHUB-3970: We can remove this when we switch to standard goals.
// Probably we don't want to create an objective template every time.
// If we we have a set list of objective templates
// they will already be linked to their goal templates.
// NOTE: Determine what to do here when we implement the objective changes.
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

// TODO: TTAHUB-3970: We can remove this when we switch to standard goals.
// If we move to standard objectives, we don't want to change the objective title.
// We also shouldn't be creating an objective template every time.
// NOTE: Determine what to do here when we implement the objective changes.
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

const autoPopulateCreator = async (sequelize, instance, options) => {
  if (skipIf(options, 'autoPopulateCreator')) return Promise.resolve();
  const { id: goalId } = instance;
  return currentUserPopulateCollaboratorForType(
    'objective',
    sequelize,
    options.transaction,
    goalId,
    OBJECTIVE_COLLABORATORS.CREATOR,
  );
};

const autoPopulateEditor = async (sequelize, instance, options) => {
  const { id: goalId } = instance;
  const changed = instance.changed();
  if (Array.isArray(changed)
    && changed.includes('title')
    && instance.previous('title') !== instance.title) {
    return currentUserPopulateCollaboratorForType(
      'objective',
      sequelize,
      options.transaction,
      goalId,
      OBJECTIVE_COLLABORATORS.EDITOR,
    );
  }
  return Promise.resolve();
};

const propagateSupportTypeToActivityReportObjective = async (sequelize, instance, options) => {
  const { id: objectiveId, supportType } = instance;
  // no support type? get outta here
  if (!supportType) return;

  // find all activity report objectives that are not the same support type
  // and are not on an approved or deleted activity report
  const activityReportObjectives = await sequelize.models.ActivityReportObjective.findAll({
    where: {
      objectiveId,
      supportType: {
        [Op.not]: supportType,
      },
    },
    include: [
      {
        model: sequelize.models.ActivityReport,
        as: 'activityReport',
        where: {
          calculatedStatus: {
            [Op.notIn]: [
              REPORT_STATUSES.APPROVED,
              REPORT_STATUSES.DELETED,
            ],
          },
        },
        required: true,
      },
    ],
    transaction: options.transaction,
  });
  await Promise.all(activityReportObjectives.map(async (aro) => aro.update({
    supportType,
  }, {
    transaction: options.transaction,
  })));
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
  preventTitleChangeWhenOnApprovedAR(sequelize, instance, options);
  autoPopulateStatusChangeDates(sequelize, instance, options);
  validateChangedOrSetEnums(sequelize, instance);
};

const beforeUpdate = async (sequelize, instance, options) => {
  preventTitleChangeWhenOnApprovedAR(sequelize, instance, options);
  autoPopulateStatusChangeDates(sequelize, instance, options);
};

const afterUpdate = async (sequelize, instance, options) => {
  await propagateTitle(sequelize, instance, options);
  await linkObjectiveGoalTemplates(sequelize, instance, options);
  await autoPopulateEditor(sequelize, instance, options);
  await propagateSupportTypeToActivityReportObjective(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await autoPopulateCreator(sequelize, instance, options);
};

export {
  findOrCreateObjectiveTemplate,
  autoPopulateOnApprovedAR,
  preventTitleChangeWhenOnApprovedAR,
  linkObjectiveGoalTemplates,
  propagateTitle,
  beforeValidate,
  beforeUpdate,
  afterUpdate,
  afterCreate,
};
