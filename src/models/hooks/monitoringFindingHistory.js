import { syncMonitoringReviewLink, syncMonitoringFindingLink, syncMonitoringFindingHistoryStatusLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([
    syncMonitoringReviewLink(sequelize, instance, options),
    syncMonitoringFindingLink(sequelize, instance, options),
    syncMonitoringFindingHistoryStatusLink(sequelize, instance, options),
  ])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([
    syncMonitoringReviewLink(sequelize, instance, options),
    syncMonitoringFindingLink(sequelize, instance, options),
    syncMonitoringFindingHistoryStatusLink(sequelize, instance, options),
  ])
}

export { beforeCreate, beforeUpdate }
