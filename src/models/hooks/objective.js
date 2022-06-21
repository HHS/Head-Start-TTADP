// import { Op } from 'sequelize';
import { auditLogger } from '../../logger';

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

// const autoPopulateObjectiveTemplateId = async (sequelize, instance, options) => {
//   try {
//     if (instance.objectiveTemplateId === undefined
//     || instance.objectiveTemplateId === null) {
//       if (instance.id !== undefined) {
//         const objective = await sequelize.models.Objective.findOne({
//           where: { id: instance.id },
//           transaction: options.transaction,
//         });
//         if (objective) {
//           if (objective.objectiveTemplateId !== undefined
//             && objective.objectiveTemplateId !== null) {
//             return;
//           }
//           instance.set('title', objective.title);
//         }
//       }
//       if (instance.title === undefined || instance.title === null) {
//         auditLogger.error(JSON.stringify(instance));
//         const err = new Error('Objective title is required');
//         auditLogger.error(JSON.stringify(err));
//         auditLogger.error(JSON.stringify(err.stack));
//         throw err;
//       }
//       let regionId = null;
//       if (instance.goalId !== undefined
//       && instance.goalId !== null) {
//         const goal = await sequelize.models.Goal.findOne({
//           where: { id: instance.goalId },
//           include: [
//             {
//               model: sequelize.models.Grant,
//               as: 'grant',
//               attributes: ['regionId'],
//             },
//           ],
//         });
//         regionId = goal.grant.regionId;
//       } else if (instance.otherEntityId !== undefined
//       && instance.otherEntityId !== null) {
//         try {
//           const otherEntity = await sequelize.models.OtherEntity.findAll({
//             attributes: [
//               [sequelize.literal('array_agg(`ActivityReports`.regionId)'), 'regionIds'],
//             ],
//             where: { id: instance.otherEntityId },
//             include: [
//               {
//                 model: sequelize.models.ActivityReport,
//                 as: 'activityReports',
//                 attribites: [],
//               },
//             ],
//             group: ['id'],
//           });
//           if (otherEntity.regionIds.length === 1) {
//             [regionId] = otherEntity.regionIds;
//           }
//         } catch (err) {
//           auditLogger.error(JSON.stringify(err));
//           throw err;
//         }
//       }

//       const templateId = await findOrCreateObjectiveTemplate(
//         sequelize,
//         options,
//         regionId,
//         instance.title,
//         instance.createdAt,
//       );
//       instance.set('objectiveTemplateId', templateId);
//     }
//   } catch (err) {
//     auditLogger.error(JSON.stringify(err));
//     throw err;
//   }
// };

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
  // eslint-disable-next-line no-prototype-builtins
  if (instance.goalId !== undefined
    && instance.goalId !== null) {
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
        goalTemplateId: goal.goalTemplateId,
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
  // await autoPopulateObjectiveTemplateId(sequelize, instance, options);
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
  findOrCreateObjectiveTemplate,
  // autoPopulateObjectiveTemplateId,
  autoPopulateOnApprovedAR,
  preventTitleChangeWhenOnApprovedAR,
  linkObjectiveGoalTemplates,
  propagateTitle,
  beforeValidate,
  afterCreate,
  afterUpdate,
};
