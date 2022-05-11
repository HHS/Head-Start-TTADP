// const { Op } = require('sequelize');
// import { auditLogger } from '../../logger';

const checkForUseOnApprovedReport = async (sequelize, instance, options) => {
  const activityReport = await sequelize.models.ActivityReport.findOne({
    where: { id: instance.activityReportId },
    transaction: options.transaction,
  });
  if (activityReport.calculatedStatus === 'Approved') {
    throw new Error('File cannot be removed from approved report.');
  }
};

const propagateDestroyToFile = async (sequelize, instance, options) => {
  const file = await sequelize.models.File.FindOne({
    where: { id: instance.fileId },
    include: [
      {
        model: sequelize.models.ActivityReportFile,
        as: 'activityReportFiles',
        required: true,
      },
      {
        model: sequelize.models.ActivityReportObjectiveFile,
        as: 'activityReportObjectiveFiles',
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
  if (file.activityReportFiles.length === 0
    && file.activityReportObjectiveFiles.length === 0
    && file.objectiveFiles.length === 0
    && file.objectiveTemplateFiles.length === 0) {
    await sequelize.models.File.destroy({
      where: { id: file.id },
      transaction: options.transaction,
    });
  }
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForUseOnApprovedReport(sequelize, instance, options);
};

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToFile(sequelize, instance, options);
};

export {
  checkForUseOnApprovedReport,
  propagateDestroyToFile,
  beforeDestroy,
  afterDestroy,
};
