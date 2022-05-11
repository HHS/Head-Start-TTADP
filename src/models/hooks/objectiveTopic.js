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
    const ott = await sequelize.models.ObjectiveTemplateTopic.findOrCreate({
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        topicId: instance.topicId,
      },
      defaults: {
        objectiveTemplateId: instance.objective.objectiveTemplateId,
        fileId: instance.fileId,
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
    const ott = await sequelize.models.ObjectiveTemplateTopic.findOne({
      attributes: ['id'],
      where: {
        objectiveTemplateId: objective.objectiveTemplateId,
        topicId: instance.topicId,
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
    if (ott.objectivesTemplate.objectives.length > 0) {
      await sequelize.models.ObjectiveTemplateTopic.update(
        {
          updatedAt: new Date(),
        },
        {
          where: { id: ott.id },
          transaction: options.transaction,
        },
      );
    } else {
      await sequelize.models.ObjectiveTemplateTopic.destroy(
        {
          where: { id: ott.id },
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
