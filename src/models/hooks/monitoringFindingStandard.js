import { syncMonitoringFindingLink, syncMonitoringStandardLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingLink(sequelize, instance, options), syncMonitoringStandardLink(sequelize, instance, options)])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingLink(sequelize, instance, options), syncMonitoringStandardLink(sequelize, instance, options)])
}

export { beforeCreate, beforeUpdate }
