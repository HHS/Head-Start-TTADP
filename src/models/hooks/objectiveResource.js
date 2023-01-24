import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';

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
    const [otr] = await sequelize.models.ObjectiveTemplateResource.findOrCreate({
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        resourceId: instance.resourceId,
      },
      transaction: options.transaction,
    });
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
};

const beforeValidate = async (sequelize, instance, options) => {
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await propagateCreateToTemplate(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToTemplate(sequelize, instance, options);
};

export {
  autoPopulateOnAR,
  autoPopulateOnApprovedAR,
  propagateCreateToTemplate,
  propagateDestroyToTemplate,
  beforeValidate,
  afterCreate,
  afterDestroy,
};
