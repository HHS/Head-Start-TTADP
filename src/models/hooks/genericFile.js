const propagateDestroyToFile = async (sequelize, instance, options) => {
  const file = await sequelize.models.File.findOne({
    where: { id: instance.fileId },
    include: [
      {
        model: sequelize.models.ActivityReportFile,
        as: 'reportFiles',
        required: false,
      },
      {
        model: sequelize.models.ActivityReportObjectiveFile,
        as: 'reportObjectiveFiles',
        required: false,
      },
      {
        model: sequelize.models.ObjectiveFile,
        as: 'objectiveFiles',
        required: false,
      },
      {
        model: sequelize.models.ObjectiveTemplateFile,
        as: 'objectiveTemplateFiles',
        required: false,
      },
      {
        model: sequelize.models.SessionReportPilotFile,
        as: 'sessionFiles',
        required: false,
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
      individualHooks: true,
      transaction: options.transaction,
    });
  }
};

export {
  // eslint-disable-next-line import/prefer-default-export
  propagateDestroyToFile,
};
