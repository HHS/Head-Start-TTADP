import { syncMonitoringFindingHistoryStatusLink } from './genericLink'

const beforeCreate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingHistoryStatusLink(sequelize, instance, options)])
}

const beforeUpdate = async (sequelize, instance, options) => {
  await Promise.all([syncMonitoringFindingHistoryStatusLink(sequelize, instance, options)])
}

export { beforeCreate, beforeUpdate }
