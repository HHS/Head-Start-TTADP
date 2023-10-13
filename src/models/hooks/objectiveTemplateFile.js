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
  const objective = await sequelize.models.Objective.findOne({
    where: { id: instance.objectiveId },
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
  if (objective && objective.objectiveTemplate.creationMethod === AUTOMATIC_CREATION) {
    const [otf] = await sequelize.models.ObjectiveTemplateFile.findOrCreate({
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        fileId: instance.fileId,
      },
      defaults: {
        objectiveTemplateId: instance.objective.objectiveTemplateId,
        fileId: instance.fileId,
      },
      transaction: options.transaction,
    });
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
  const objective = await sequelize.models.Objective.findAll({
    where: { objectiveTemplateId: instance.objectiveTemplateId, onApprovedAR: true },
    transaction: options.transaction,
  });
  if (objective.length > 0) {
    throw new Error('File cannot be removed, used on approved report.');
  }
};

const propagateDestroyToTemplate = async (sequelize, instance, options) => {
  const objective = await sequelize.models.Objective.findOne({
    where: { id: instance.objectiveId },
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
  if (objective.objectiveTemplate.creationMethod === AUTOMATIC_CREATION) {
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
  autoPopulateIsFlagged('isFoiaable', instance, options);
  autoPopulateIsFlagged('isReferenced', instance, options);
};

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await propagateCreateToTemplate(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForUseOnApprovedReport(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await checkForAttemptToRemoveFoiaableValue(sequelize, instance, options);
  await propagateDestroyToFile(sequelize, instance, options);
  await cleanupOrphanFiles(sequelize, instance.fileId);
};

export {
  propagateCreateToTemplate,
  propagateDestroyToTemplate,
  checkForUseOnApprovedReport,
  beforeValidate,
  beforeUpdate,
  afterCreate,
  beforeDestroy,
  afterDestroy,
};
