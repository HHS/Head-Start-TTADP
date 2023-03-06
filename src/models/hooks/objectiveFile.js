import { Op } from 'sequelize';
import { AUTOMATIC_CREATION } from '../../constants';
import { propagateDestroyToFile } from './genericFile';

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

// When a new file is added to an objective, add the file to the template or update the
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
  const activityReport = await sequelize.models.Objective.findOne({
    where: { id: instance.objectiveId },
    transaction: options.transaction,
  });
  if (activityReport.onApprovedAR) {
    throw new Error('File cannot be removed, used on approved report.');
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
  if (!Array.isArray(options.fields)) {
    options.fields = []; //eslint-disable-line
  }
  autoPopulateOnAR(sequelize, instance, options);
  autoPopulateOnApprovedAR(sequelize, instance, options);
};

const afterCreate = async (sequelize, instance, options) => {
  await propagateCreateToTemplate(sequelize, instance, options);
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForUseOnApprovedReport(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToTemplate(sequelize, instance, options);
  await propagateDestroyToFile(sequelize, instance, options);
};

export {
  autoPopulateOnAR,
  autoPopulateOnApprovedAR,
  propagateCreateToTemplate,
  checkForUseOnApprovedReport,
  propagateDestroyToTemplate,
  beforeValidate,
  afterCreate,
  beforeDestroy,
  afterDestroy,
};
