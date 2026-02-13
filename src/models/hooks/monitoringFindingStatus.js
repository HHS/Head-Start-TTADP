import { syncMonitoringFindingStatusLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingStatusLink(sequelize, instance, options)])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingStatusLink(sequelize, instance, options)])
}

export { beforeCreate, beforeUpdate }
