import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';
import { skipIf } from '../helpers/flowControl';
import {
  checkForAttemptToChangeFoiaableValue,
  checkForAttemptToRemoveFoiaableValue,
  autoPopulateIsFlagged,
} from '../helpers/isFlagged';

// When a new resource is added to an objective, add the resource to the template or update the
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
    const [ott] = await sequelize.models.ObjectiveTemplateTopic.findOrCreate({
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        topicId: instance.topicId,
      },
      transaction: options.transaction,
    });
    await sequelize.models.ObjectiveTemplateTopic.update(
      {
        updatedAt: new Date(),
      },
      {
        where: { id: ott.id },
        transaction: options.transaction,
        individualHooks: true,
      },
    );
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
    const ott = await sequelize.models.ObjectiveTemplateTopic.findOne({
      attributes: ['id'],
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        topicId: instance.topicId,
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
    if (ott.objectiveTemplate.objectives.length > 0) {
      await sequelize.models.ObjectiveTemplateTopic.update(
        {
          updatedAt: new Date(),
        },
        {
          where: { id: ott.id },
          transaction: options.transaction,
          individualHooks: true,
        },
      );
    } else {
      await sequelize.models.ObjectiveTemplateTopic.destroy(
        {
          where: { id: ott.id },
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

const beforeUpdate = async (sequelize, instance, options) => {
  await checkForAttemptToChangeFoiaableValue(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  if (skipIf(options, 'afterCreate')) return;
  await propagateCreateToTemplate(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForAttemptToRemoveFoiaableValue(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  if (skipIf(options, 'afterDestroy')) return;
  await propagateDestroyToTemplate(sequelize, instance, options);
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
