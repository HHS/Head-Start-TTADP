import { propagateDestroyToFile } from './genericFile';

const checkForUseOnApprovedReport = async (sequelize, instance, options) => {
  const activityReport = await sequelize.models.ActivityReport.findOne({
    where: { id: instance.activityReportId },
    transaction: options.transaction,
  });
  if (activityReport.approval.calculatedStatus === 'Approved') {
    throw new Error('File cannot be removed from approved report.');
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
