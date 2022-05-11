// const { Op } = require('sequelize');
// import { auditLogger } from '../../logger';
import { CREATION_METHOD } from '../../constants';

// When a new resource is added to an objective, add the resource to the template or update the
// updatedAt value.
const propagateCreateToTemplate = async (sequelize, instance, options) => {
  const objective = await sequelize.models.Objective.findOne({
    where: { id: instance.objectiveId },
    include: [
      {
        model: sequelize.models.ObjectiveTemplate,
        as: 'objectivesTemplate',
        required: true,
        attributes: ['id', 'creationMethod'],
      },
    ],
    transaction: options.transaction,
  });
  if (objective.objectivesTemplate.creationMethod === CREATION_METHOD[0]) { // 'Automatic'
    const otr = await sequelize.models.ObjectiveTemplateResource.findOrCreate({
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        userProvidedUrl: instance.userProvidedUrl,
      },
      defaults: {
        objectiveTemplateId: objective.objectiveTemplateId,
        userProvidedUrl: instance.userProvidedUrl,
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
      },
    );
  }
};

const propagateDestroyToTemplate = async (sequelize, instance, options) => {
  const objective = await sequelize.models.Objective.findOne({
    where: { id: instance.objectiveId },
    include: [
      {
        model: sequelize.models.ObjectiveTemplate,
        as: 'objectivesTemplate',
        required: true,
        attributes: ['id', 'creationMethod'],
      },
    ],
    transaction: options.transaction,
  });
  if (objective.objectivesTemplate.creationMethod === CREATION_METHOD[0]) { // 'Automatic'
    const otr = await sequelize.models.ObjectiveTemplateResource.findOne({
      attributes: ['id'],
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        userProvidedUrl: instance.userProvidedUrl,
      },
      include: [
        {
          model: sequelize.models.ObjectiveTemplate,
          as: 'objectivesTemplate',
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
    if (otr.objectivesTemplate.objectives.length > 0) {
      await sequelize.models.ObjectiveTemplateResource.update(
        {
          updatedAt: new Date(),
        },
        {
          where: { id: otr.id },
          transaction: options.transaction,
        },
      );
    } else {
      await sequelize.models.ObjectiveTemplateResource.destroy(
        {
          where: { id: otr.id },
          transaction: options.transaction,
        },
      );
    }
  }
};

const afterCreate = async (sequelize, instance, options) => {
  await propagateCreateToTemplate(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToTemplate(sequelize, instance, options);
};

export {
  propagateCreateToTemplate,
  propagateDestroyToTemplate,
  afterCreate,
  afterDestroy,
};
