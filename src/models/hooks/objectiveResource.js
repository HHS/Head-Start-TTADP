import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';
import {
  checkForAttemptToChangeFoiaableValue,
  checkForAttemptToRemoveFoiaableValue,
  autoPopulateFlag,
} from '../helpers/isFlagged';

import { cleanupOrphanResources } from '../helpers/orphanCleanupHelper';

// When a new resource is added to an objective, add the resource to the template or update the
// updatedAt value.
const propagateCreateToTemplate = async (sequelize, instance, options) => {
  const objective = await sequelize.models.Objective.findOne({
    attributes: [
      'id',
      'objectiveTemplateId',
    ],
    where: {
      id: instance.objectiveId,
      objectiveTemplateId: { [Op.not]: null },
    },
    include: [
      {
        model: sequelize.models.ObjectiveTemplate,
        as: 'objectiveTemplate',
        required: true,
        attributes: ['id', 'creationMethod'],
      },
    ],
    transaction: options.transaction,
  });

  if (objective
    && objective.objectiveTemplateId !== null
    && objective.objectiveTemplate.creationMethod === AUTOMATIC_CREATION) {
    const [otr, wasCreated] = await sequelize.models.ObjectiveTemplateResource.findOrCreate({
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        resourceId: instance.resourceId,
      },
      transaction: options.transaction,
    });

    if (wasCreated) {
      await sequelize.models.ObjectiveTemplateResource.update(
        {
          updatedAt: new Date(),
        },
        {
          where: { id: otr.id },
          transaction: options.transaction,
          individualHooks: true,
        },
      );
    }
  }
};

const propagateDestroyToTemplate = async (sequelize, instance, options) => {
  const objective = await sequelize.models.Objective.findOne({
    attributes: [
      'id',
      'objectiveTemplateId',
    ],
    where: {
      id: instance.objectiveId,
      objectiveTemplateId: { [Op.not]: null },
    },
    include: [
      {
        model: sequelize.models.ObjectiveTemplate,
        as: 'objectiveTemplate',
        required: true,
        attributes: ['id', 'creationMethod'],
      },
    ],
    transaction: options.transaction,
  });
  if (objective
    && objective.objectiveTemplateId !== null
    && objective.objectiveTemplate.creationMethod === AUTOMATIC_CREATION) {
    const otr = await sequelize.models.ObjectiveTemplateResource.findOne({
      attributes: ['id'],
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        resourceId: instance.resourceId,
      },
      include: [
        {
          model: sequelize.models.ObjectiveTemplate,
          as: 'objectiveTemplate',
          required: true,
          include: [
            {
              model: sequelize.models.Objective,
              as: 'objectives',
              required: true,
              attributes: ['id'],
              where: { onApprovedAR: true },
            },
          ],
        },
      ],
      transaction: options.transaction,
    });
    if (otr) {
      if (otr.objectiveTemplate.objectives.length > 0) {
        await sequelize.models.ObjectiveTemplateResource.update(
          {
            updatedAt: new Date(),
          },
          {
            where: { id: otr.id },
            transaction: options.transaction,
            individualHooks: true,
          },
        );
      } else {
        await sequelize.models.ObjectiveTemplateResource.destroy(
          {
            where: { id: otr.id },
            individualHooks: true,
            transaction: options.transaction,
          },
        );
      }
    }
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateFlag(sequelize, instance, options, 'onAR');
  autoPopulateFlag(sequelize, instance, options, 'onApprovedAR');
  autoPopulateFlag(sequelize, instance, options, 'isFoiaable');
  autoPopulateFlag(sequelize, instance, options, 'isReferenced');
};

const afterCreate = async (sequelize, instance, options) => {
  await propagateCreateToTemplate(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForAttemptToRemoveFoiaableValue(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToTemplate(sequelize, instance, options);
  await cleanupOrphanResources(sequelize, instance.resourceId);
};

export {
  propagateCreateToTemplate,
  propagateDestroyToTemplate,
  beforeValidate,
  beforeUpdate,
  beforeDestroy,
  afterCreate,
  afterDestroy,
};
