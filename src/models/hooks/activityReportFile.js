import { REPORT_STATUSES } from '@ttahub/common'
import { propagateDestroyToFile } from './genericFile'

const { cleanupOrphanFiles } = require('../helpers/orphanCleanupHelper')

const checkForUseOnApprovedReport = async (sequelize, instance, options) => {
  const activityReport = await sequelize.models.ActivityReport.findOne({
    where: { id: instance.activityReportId },
    transaction: options.transaction,
  })
  if (activityReport.calculatedStatus === REPORT_STATUSES.APPROVED) {
    throw new Error('File cannot be removed from approved report.')
  }
}

const beforeDestroy = async (sequelize, instance, options) => {
  await checkForUseOnApprovedReport(sequelize, instance, options)
}

const afterDestroy = async (sequelize, instance, options) => {
  await propagateDestroyToFile(sequelize, instance, options)
  await cleanupOrphanFiles(sequelize, instance.fileId)
}

export { checkForUseOnApprovedReport, propagateDestroyToFile, beforeDestroy, afterDestroy }
