import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';
import { propagateDestroyToFile } from './genericFile';
import { skipIf } from '../helpers/flowControl';
import {
  checkForAttemptToChangeFoiaableValue,
  checkForAttemptToRemoveFoiaableValue,
  autoPopulateIsFlagged,
} from '../helpers/isFlagged';

import { cleanupOrphanFiles } from '../helpers/orphanCleanupHelper';

// When a new file is added to an objective, add the file to the template or update the
// updatedAt value.
const propagateCreateToTemplate = async (sequelize, instance, options) => {
  if (skipIf(options, 'propagateCreateToTemplate')) return;
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
    let otf = await sequelize.models.ObjectiveTemplateFile.findOne({
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        fileId: instance.fileId,
      },
      transaction: options.transaction,
    });

    if (!otf) {
      otf = await sequelize.models.ObjectiveTemplateFile.create(
        {

          objectiveTemplateId: objective.objectiveTemplateId,
          fileId: instance.fileId,
        },
        { transaction: options.transaction },
      );
    }

    await sequelize.models.ObjectiveTemplateFile.update(
      {
        updatedAt: new Date(),
      },
      {
        where: { id: otf.id },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
  }
};

const checkForUseOnApprovedReport = async (sequelize, instance, options) => {
  if (skipIf(options, 'checkForUseOnApprovedReport')) return;
  const activityReport = await sequelize.models.Objective.findOne({
    where: { id: instance.objectiveId },
    transaction: options.transaction,
  });
  if (activityReport.onApprovedAR) {
    throw new Error('File cannot be removed, used on approved report.');
  }
};

const propagateDestroyToTemplate = async (sequelize, instance, options) => {
  if (skipIf(options, 'propagateDestroyToTemplate')) return;
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
    const otfs = await sequelize.models.ObjectiveTemplateFile.findOne({
      attributes: ['id'],
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        fileId: instance.fileId,
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
    if (otfs.objectiveTemplate.objectives.length > 0) {
      await sequelize.models.ObjectiveTemplateFile.update(
        {
          updatedAt: new Date(),
        },
        {
          where: { id: otfs.id },
          transaction: options.transaction,
          individualHooks: true,
        },
      );
    } else {
      await sequelize.models.ObjectiveTemplateFile.destroy(
        {
          where: { id: otfs.id },
          individualHooks: true,
          transaction: options.transaction,
        },
      );
    }
  }
};

const beforeValidate = async (sequelize, instance, options) => {
  if (skipIf(options, 'beforeValidate')) return;
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateIsFlagged('onAR', instance, options);
  autoPopulateIsFlagged('onApprovedAR', instance, options);
  autoPopulateIsFlagged('isFoiaable', instance, options);
  autoPopulateIsFlagged('isReferenced', instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  if (skipIf(options, 'afterCreate')) return;
  await propagateCreateToTemplate(sequelize, instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  if (skipIf(options, 'beforeDestroy')) return;
  await checkForUseOnApprovedReport(sequelize, instance, options); // TODO: check to see if this can be removed
  await checkForAttemptToRemoveFoiaableValue(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  if (skipIf(options, 'afterDestroy')) return;
  await propagateDestroyToTemplate(sequelize, instance, options);
  await propagateDestroyToFile(sequelize, instance, options);
  await cleanupOrphanFiles(sequelize, instance.fileId);
};

export {
  propagateCreateToTemplate,
  checkForUseOnApprovedReport,
  propagateDestroyToTemplate,
  beforeValidate,
  beforeUpdate,
  afterCreate,
  beforeDestroy,
  afterDestroy,
};
