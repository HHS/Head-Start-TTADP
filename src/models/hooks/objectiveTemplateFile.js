// const { Op } = require('sequelize');
// import { auditLogger } from '../../logger';
import { CREATION_METHOD } from '../../constants';

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
  if (objective.objectiveTemplate.creationMethod === CREATION_METHOD[0]) { // 'Automatic'
    const otf = await sequelize.models.ObjectiveTemplateFile.findOrCreate({
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
      },
    );
  }
};

const checkForUseOnApprovedReport = async (sequelize, instance, options) => {
  const activityReport = await sequelize.models.Objective.findAll({
    where: { objectiveTemplateId: instance.objectiveTemplateId, onApprovedAR: true },
    transaction: options.transaction,
  });
  if (activityReport.length > 0) {
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
  if (objective.objectiveTemplate.creationMethod === CREATION_METHOD[0]) { // 'Automatic'
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
        },
      );
    } else {
      await sequelize.models.ObjectiveTemplateFile.destroy(
        {
          where: { id: otfs.id },
          transaction: options.transaction,
        },
      );
    }
  }
};

const propagateDestroyToFile = async (sequelize, instance, options) => {
  const file = await sequelize.models.File.FindOne({
    where: { id: instance.fileId },
    include: [
      {
        model: sequelize.models.ActivityReportFile,
        as: 'reportFiles',
        required: true,
      },
      {
        model: sequelize.models.ActivityReportObjectiveFile,
        as: 'reportObjectiveFiles',
        required: true,
      },
      {
        model: sequelize.models.ObjectiveFile,
        as: 'objectiveFiles',
        required: true,
      },
      {
        model: sequelize.models.ObjectiveTemplateFile,
        as: 'objectiveTemplateFiles',
        required: true,
      },
    ],
    transaction: options.transaction,
  });
  if (file.reportFiles.length === 0
    && file.reportObjectiveFiles.length === 0
    && file.objectiveFiles.length === 0
    && file.objectiveTemplateFiles.length === 0) {
    await sequelize.models.File.destroy({
      where: { id: file.id },
      transaction: options.transaction,
    });
  }
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
  propagateCreateToTemplate,
  propagateDestroyToTemplate,
  afterCreate,
  beforeDestroy,
  afterDestroy,
};
