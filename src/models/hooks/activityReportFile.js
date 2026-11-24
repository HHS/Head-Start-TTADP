import { REPORT_STATUSES } from '@ttahub/common';

const checkForUseOnApprovedReport = async (sequelize, instance, options) => {
  const activityReport = await sequelize.models.ActivityReport.findOne({
    where: { id: instance.activityReportId },
    transaction: options.transaction,
  });
  if (activityReport.calculatedStatus === REPORT_STATUSES.APPROVED) {
    throw new Error('File cannot be removed from approved report.');
  }
};

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForUseOnApprovedReport(sequelize, instance, options);
};

export { beforeDestroy, checkForUseOnApprovedReport };
