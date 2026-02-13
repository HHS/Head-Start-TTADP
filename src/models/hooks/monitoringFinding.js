import { syncMonitoringFindingLink, syncMonitoringFindingStatusLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingLink(sequelize, instance, options), syncMonitoringFindingStatusLink(sequelize, instance, options)])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingLink(sequelize, instance, options), syncMonitoringFindingStatusLink(sequelize, instance, options)])
}

export { beforeCreate, beforeUpdate }
